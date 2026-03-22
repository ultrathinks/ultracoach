"use client";

import { useCallback, useRef, useState } from "react";
import { createElevenLabsTTS } from "./elevenlabs-tts";
import { createPcmPlayer } from "./pcm-player";
import { createSimliAvatar } from "./simli-avatar";

interface AvatarHandle {
  sendAudio: (pcm16: Uint8Array) => void;
  stop: () => Promise<void>;
}

export function useAvatar() {
  const avatarRef = useRef<AvatarHandle | null>(null);
  const ttsRef = useRef<ReturnType<typeof createElevenLabsTTS> | null>(null);
  const pcmPlayerRef = useRef<ReturnType<typeof createPcmPlayer> | null>(null);
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
        pcmPlayerRef.current = createPcmPlayer();
      }

      setIsConnected(true);
    },
    [],
  );

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!ttsRef.current) {
          reject(new Error("tts not initialized"));
          return;
        }

        setIsSpeaking(true);
        ttsRef.current.speak(text, {
          onAudioChunk: (pcm16) => {
            if (avatarRef.current) {
              avatarRef.current.sendAudio(pcm16);
            } else {
              pcmPlayerRef.current?.play(pcm16);
            }
          },
          onDone: () => {
            setIsSpeaking(false);
            resolve();
          },
          onError: (err) => {
            setIsSpeaking(false);
            reject(new Error(err));
          },
        });
      });
    },
    [],
  );

  const disconnect = useCallback(async () => {
    ttsRef.current?.stop();
    pcmPlayerRef.current?.stop();
    await avatarRef.current?.stop();
    avatarRef.current = null;
    ttsRef.current = null;
    pcmPlayerRef.current = null;
    setIsConnected(false);
    setIsSpeaking(false);
  }, []);

  return { connect, speak, disconnect, isSpeaking, isConnected };
}
