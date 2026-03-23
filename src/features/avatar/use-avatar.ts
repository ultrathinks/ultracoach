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
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const connectPromiseRef = useRef<Promise<void> | null>(null);
  const keepAliveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const markAvatarDisconnected = useCallback((reason: string) => {
    console.warn("simli connection lost:", reason);
    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }
    avatarRef.current = null;
    setIsConnected(false);
  }, []);

  const stopKeepAlive = useCallback(() => {
    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }
  }, []);

  const startKeepAlive = useCallback(() => {
    stopKeepAlive();
    keepAliveTimerRef.current = setInterval(() => {
      const avatar = avatarRef.current;
      if (!avatar) return;
      try {
        // 20ms @ 16kHz mono PCM16 silence frame
        avatar.sendAudio(new Uint8Array(640));
      } catch (err) {
        console.warn("simli keepalive failed:", err);
        markAvatarDisconnected("keepalive failed");
      }
    }, 5000);
  }, [markAvatarDisconnected, stopKeepAlive]);

  const connectSimli = useCallback(
    async (videoElement: HTMLVideoElement, audioElement: HTMLAudioElement) => {
      if (avatarRef.current) {
        setIsConnected(true);
        return;
      }
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
        onDisconnected: markAvatarDisconnected,
      });
      avatarRef.current = avatar;
      setIsConnected(true);
      startKeepAlive();
    },
    [markAvatarDisconnected, startKeepAlive],
  );

  const playMp3Fallback = useCallback(async (mp3Buffer: ArrayBuffer) => {
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
  }, []);

  const tryReconnect = useCallback(async () => {
    if (connectPromiseRef.current) {
      await connectPromiseRef.current;
      return;
    }
    const videoElement = videoElementRef.current;
    const audioElement = audioElementRef.current;
    if (!videoElement || !audioElement) return;

    try {
      const connectTask = connectSimli(videoElement, audioElement);
      connectPromiseRef.current = connectTask;
      await connectTask;
    } catch (err) {
      console.warn("simli reconnect failed:", err);
      avatarRef.current = null;
      setIsConnected(false);
    } finally {
      connectPromiseRef.current = null;
    }
  }, [connectSimli]);

  const connect = useCallback(
    async (videoElement: HTMLVideoElement, audioElement: HTMLAudioElement) => {
      videoElementRef.current = videoElement;
      audioElementRef.current = audioElement;
      ttsRef.current = createElevenLabsTTS();

      if (connectPromiseRef.current) {
        await connectPromiseRef.current;
        return;
      }

      try {
        const connectTask = connectSimli(videoElement, audioElement);
        connectPromiseRef.current = connectTask;
        await connectTask;
      } catch (err) {
        console.warn("simli unavailable, using direct audio playback:", err);
        avatarRef.current = null;
        setIsConnected(false);
      } finally {
        connectPromiseRef.current = null;
      }
    },
    [connectSimli],
  );

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!ttsRef.current) throw new Error("tts not initialized");

      setIsSpeaking(true);

      try {
        const mp3Buffer = await ttsRef.current.speak(text);

        if (!avatarRef.current) {
          await tryReconnect();
        }

        if (avatarRef.current) {
          // Simli 경로: MP3 -> PCM16 변환 후 전송
          const decodeCtx = new AudioContext({ sampleRate: 16000 });
          const audioBuffer = await decodeCtx.decodeAudioData(
            mp3Buffer.slice(0),
          );
          const float32 = audioBuffer.getChannelData(0);
          const pcm16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          await decodeCtx.close();

          const bytes = new Uint8Array(pcm16.buffer);
          const chunkSize = 6000;
          try {
            for (let i = 0; i < bytes.length; i += chunkSize) {
              avatarRef.current.sendAudio(bytes.slice(i, i + chunkSize));
            }
          } catch (err) {
            console.warn(
              "simli sendAudio failed, fallback to local playback:",
              err,
            );
            markAvatarDisconnected("sendAudio failed");
            await playMp3Fallback(mp3Buffer);
            return;
          }

          // 재생 시간만큼 대기
          await new Promise<void>((r) =>
            setTimeout(r, audioBuffer.duration * 1000 + 500),
          );
        } else {
          // 폴백: AudioContext로 MP3 직접 재생
          await playMp3Fallback(mp3Buffer);
        }
      } finally {
        setIsSpeaking(false);
      }
    },
    [markAvatarDisconnected, playMp3Fallback, tryReconnect],
  );

  const disconnect = useCallback(async () => {
    if (connectPromiseRef.current) {
      try {
        await connectPromiseRef.current;
      } catch {
        // ignore connect failures during teardown
      }
    }
    ttsRef.current?.stop();
    stopKeepAlive();
    currentSourceRef.current?.stop();
    currentSourceRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    await avatarRef.current?.stop();
    avatarRef.current = null;
    videoElementRef.current = null;
    audioElementRef.current = null;
    connectPromiseRef.current = null;
    ttsRef.current = null;
    setIsConnected(false);
    setIsSpeaking(false);
  }, [stopKeepAlive]);

  return { connect, speak, disconnect, isSpeaking, isConnected };
}
