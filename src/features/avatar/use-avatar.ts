"use client";

import { useCallback, useRef, useState } from "react";
import type { AvatarId } from "@/shared/config/avatars";
import { createElevenLabsTts, type TtsClient } from "./providers/elevenlabs";
import { type AvatarHandle, createSimliAvatar } from "./providers/simli";

const KEEPALIVE_INTERVAL_MS = 5000;
const SILENCE_FRAME_BYTES = 640; // 20ms @ 16kHz mono PCM16
const PCM_CHUNK_SIZE = 6000;

export function useAvatar({ avatarId }: { avatarId: AvatarId }) {
  const avatarRef = useRef<AvatarHandle | null>(null);
  const ttsRef = useRef<TtsClient | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const connectPromiseRef = useRef<Promise<void> | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleDisconnect = useCallback((reason: string) => {
    console.warn("avatar connection lost:", reason);
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    avatarRef.current = null;
    setIsConnected(false);
  }, []);

  const stopKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);

  const startKeepAlive = useCallback(() => {
    stopKeepAlive();
    keepAliveRef.current = setInterval(() => {
      const avatar = avatarRef.current;
      if (!avatar) return;
      try {
        avatar.sendAudio(new Uint8Array(SILENCE_FRAME_BYTES));
      } catch (err) {
        console.warn("avatar keepalive failed:", err);
        handleDisconnect("keepalive failed");
      }
    }, KEEPALIVE_INTERVAL_MS);
  }, [handleDisconnect, stopKeepAlive]);

  const connectAvatar = useCallback(
    async (videoElement: HTMLVideoElement, audioElement: HTMLAudioElement) => {
      if (avatarRef.current) {
        setIsConnected(true);
        return;
      }
      const res = await fetch("/api/simli-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarId }),
      });
      if (!res.ok) throw new Error("avatar token fetch failed");
      const { sessionToken, iceServers } = await res.json();

      const avatar = await createSimliAvatar({
        videoElement,
        audioElement,
        sessionToken,
        iceServers,
        onSpeaking: () => setIsSpeaking(true),
        onSilent: () => setIsSpeaking(false),
        onDisconnected: handleDisconnect,
      });
      avatarRef.current = avatar;
      setIsConnected(true);
      startKeepAlive();
    },
    [avatarId, handleDisconnect, startKeepAlive],
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
      const connectTask = connectAvatar(videoElement, audioElement);
      connectPromiseRef.current = connectTask;
      await connectTask;
    } catch (err) {
      console.warn("avatar reconnect failed:", err);
      avatarRef.current = null;
      setIsConnected(false);
    } finally {
      connectPromiseRef.current = null;
    }
  }, [connectAvatar]);

  const connect = useCallback(
    async (videoElement: HTMLVideoElement, audioElement: HTMLAudioElement) => {
      videoElementRef.current = videoElement;
      audioElementRef.current = audioElement;
      ttsRef.current = createElevenLabsTts({ avatarId });

      if (connectPromiseRef.current) {
        await connectPromiseRef.current;
        return;
      }

      try {
        const connectTask = connectAvatar(videoElement, audioElement);
        connectPromiseRef.current = connectTask;
        await connectTask;
      } catch (err) {
        console.warn("avatar unavailable, using direct audio playback:", err);
        avatarRef.current = null;
        setIsConnected(false);
      } finally {
        connectPromiseRef.current = null;
      }
    },
    [avatarId, connectAvatar],
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
          try {
            for (let i = 0; i < bytes.length; i += PCM_CHUNK_SIZE) {
              avatarRef.current.sendAudio(bytes.slice(i, i + PCM_CHUNK_SIZE));
            }
          } catch (err) {
            console.warn(
              "avatar sendAudio failed, fallback to local playback:",
              err,
            );
            handleDisconnect("sendAudio failed");
            await playMp3Fallback(mp3Buffer);
            return;
          }

          await new Promise<void>((r) =>
            setTimeout(r, audioBuffer.duration * 1000 + 500),
          );
        } else {
          await playMp3Fallback(mp3Buffer);
        }
      } finally {
        setIsSpeaking(false);
      }
    },
    [handleDisconnect, playMp3Fallback, tryReconnect],
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
