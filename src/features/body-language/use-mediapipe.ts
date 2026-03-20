"use client";

import { useMetricsStore, type MetricSnapshot } from "@/entities/metrics";
import { useCallback, useRef } from "react";

export function useMediaPipe() {
  const workerRef = useRef<Worker | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const push = useMetricsStore((s) => s.push);

  const start = useCallback(
    (videoElement: HTMLVideoElement) => {
      const worker = new Worker(
        new URL("../../../workers/mediapipe.worker.ts", import.meta.url),
        { type: "module" },
      );

      worker.onmessage = (e) => {
        if (e.data.type === "snapshot") {
          push(e.data.data as MetricSnapshot);
        }
      };

      worker.postMessage({ type: "init" });
      workerRef.current = worker;

      // send frames at ~5fps
      intervalRef.current = setInterval(async () => {
        if (
          videoElement.readyState < 2 ||
          videoElement.videoWidth === 0
        )
          return;

        try {
          const bitmap = await createImageBitmap(videoElement);
          worker.postMessage(
            { type: "frame", bitmap, timestamp: Date.now() },
            [bitmap],
          );
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
  }, []);

  return { start, stop };
}
