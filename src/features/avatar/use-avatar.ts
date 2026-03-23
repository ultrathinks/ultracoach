"use client";

import { useCallback, useRef, useState } from "react";
import { createElevenLabsTTS } from "./elevenlabs-tts";
import { createSimliAvatar } from "./simli-avatar";

interface AvatarHandle {
  sendAudio: (pcm16: Uint8Array) => void;
  stop: () => Promise<void>;
}

export function useAvatar() {
  const avatarRef = useRef<AvatarHandle | null>(null);
  const ttsRef = useRef<ReturnType<typeof createElevenLabsTTS> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(
    async (
      videoElement: HTMLVideoElement,
      audioElement: HTMLAudioElement,
    ) => {
      ttsRef.current = createElevenLabsTTS();

      try {
        const res = await fetch("/api/simli-token", { method: "POST" });
        if (!res.ok) throw new Error("simli token fetch failed");
        const { sessionToken, iceServers } = await res.json();

        const avatar = await createSimliAvatar({
          videoElement,
          audioElement,
          sessionToken,
          iceServers,
          onSpeaking: () => setIsSpeaking(true),
          onSilent: () => setIsSpeaking(false),
        });
        avatarRef.current = avatar;
      } catch (err) {
        console.warn("simli unavailable, using direct audio playback:", err);
      }

      setIsConnected(true);
    },
    [],
  );

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!ttsRef.current) throw new Error("tts not initialized");

      setIsSpeaking(true);

      try {
        const mp3Buffer = await ttsRef.current.speak(text);

        if (avatarRef.current) {
          // Simli 경로: MP3 → PCM16 변환 후 전송
          const decodeCtx = new AudioContext({ sampleRate: 16000 });
          const audioBuffer = await decodeCtx.decodeAudioData(mp3Buffer.slice(0));
          const float32 = audioBuffer.getChannelData(0);
          const pcm16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          await decodeCtx.close();

          const bytes = new Uint8Array(pcm16.buffer);
          const chunkSize = 6000;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            avatarRef.current.sendAudio(bytes.slice(i, i + chunkSize));
          }

          // 재생 시간만큼 대기
          await new Promise<void>((r) =>
            setTimeout(r, audioBuffer.duration * 1000 + 500),
          );
        } else {
          // 폴백: AudioContext로 MP3 직접 재생 (지직거림 없음)
          if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContext();
          }
          const ctx = audioCtxRef.current;
          if (ctx.state === "suspended") await ctx.resume();

          const audioBuffer = await ctx.decodeAudioData(mp3Buffer.slice(0));

          await new Promise<void>((resolve) => {
            currentSourceRef.current?.stop();
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.onended = () => {
              currentSourceRef.current = null;
              resolve();
            };
            currentSourceRef.current = source;
            source.start();
          });
        }
      } finally {
        setIsSpeaking(false);
      }
    },
    [],
  );

  const disconnect = useCallback(async () => {
    ttsRef.current?.stop();
    currentSourceRef.current?.stop();
    currentSourceRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    await avatarRef.current?.stop();
    avatarRef.current = null;
    ttsRef.current = null;
    setIsConnected(false);
    setIsSpeaking(false);
  }, []);

  return { connect, speak, disconnect, isSpeaking, isConnected };
}
