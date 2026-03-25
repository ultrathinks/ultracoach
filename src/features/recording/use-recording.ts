"use client";

import { useCallback, useRef, useState } from "react";
import { db } from "@/shared/config/dexie";

export function useRecording() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const start = useCallback((stream: MediaStream) => {
    const liveTracks = stream
      .getTracks()
      .filter((t) => t.readyState === "live");
    if (liveTracks.length === 0) {
      console.warn("no live tracks, skipping recording");
      return;
    }

    const prevRecorder = recorderRef.current;
    if (prevRecorder && prevRecorder.state !== "inactive") {
      prevRecorder.stop();
    }

    chunksRef.current = [];
    const recordStream = new MediaStream(liveTracks);

    const mimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    let recorder: MediaRecorder | null = null;
    for (const mt of mimeTypes) {
      if (!MediaRecorder.isTypeSupported(mt)) continue;
      try {
        recorder = new MediaRecorder(recordStream, { mimeType: mt });
        break;
      } catch {
        continue;
      }
    }

    if (!recorder) {
      try {
        recorder = new MediaRecorder(recordStream);
      } catch (err) {
        console.warn("MediaRecorder not available, skipping recording:", err);
        return;
      }
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorderRef.current = recorder;
    try {
      recorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      console.warn("MediaRecorder start failed:", err);
      recorderRef.current = null;
    }
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

  const dispose = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    recorder.ondataavailable = null;
    recorder.onstop = null;

    if (recorder.state !== "inactive") {
      recorder.stop();
    }

    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
  }, []);

  return { start, stop, dispose, isRecording };
}
