"use client";

import { useCallback, useRef, useState } from "react";
import { z } from "zod";
import { metricSnapshotSchema, useMetricsStore } from "@/entities/metrics";

export interface Landmarks {
  face: number[][];
  pose: number[][];
  hands: number[][][];
}

const landmarksSchema = z.object({
  face: z.array(z.array(z.number())),
  pose: z.array(z.array(z.number())),
  hands: z.array(z.array(z.array(z.number()))),
});

const workerMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("snapshot"), data: metricSnapshotSchema }),
  z.object({ type: z.literal("landmarks"), data: landmarksSchema }),
]);

export function useMediaPipe() {
  const workerRef = useRef<Worker | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const push = useMetricsStore((s) => s.push);
  const [landmarks, setLandmarks] = useState<Landmarks | null>(null);

  const start = useCallback(
    (videoElement: HTMLVideoElement) => {
      const worker = new Worker(
        new URL("../../../workers/mediapipe.worker.ts", import.meta.url),
        { type: "module" },
      );

      worker.onmessage = (e) => {
        const parsed = workerMessageSchema.safeParse(e.data);
        if (!parsed.success) return;
        if (parsed.data.type === "snapshot") {
          push(parsed.data.data);
        } else {
          setLandmarks(parsed.data.data);
        }
      };

      worker.postMessage({ type: "init" });
      workerRef.current = worker;

      intervalRef.current = setInterval(async () => {
        if (videoElement.readyState < 2 || videoElement.videoWidth === 0)
          return;

        try {
          const bitmap = await createImageBitmap(videoElement);
          worker.postMessage({ type: "frame", bitmap, timestamp: Date.now() }, [
            bitmap,
          ]);
        } catch {
          // frame capture failed
        }
      }, 200);
    },
    [push],
  );

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    workerRef.current?.terminate();
    workerRef.current = null;
    setLandmarks(null);
  }, []);

  return { start, stop, landmarks };
}
