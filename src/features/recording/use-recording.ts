"use client";

import { useCallback, useRef, useState } from "react";
import { db } from "@/shared/config/dexie";

export function useRecording() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const start = useCallback((stream: MediaStream) => {
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9,opus",
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorderRef.current = recorder;
    recorder.start(1000);
    setIsRecording(true);
  }, []);

  const stop = useCallback(async (sessionId: string) => {
    return new Promise<void>((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve();
        return;
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        await db.recordings.add({
          sessionId,
          type: "video",
          blob,
        });
        recorderRef.current = null;
        setIsRecording(false);
        resolve();
      };

      recorder.stop();
    });
  }, []);

  return { start, stop, isRecording };
}
