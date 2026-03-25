"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";

interface DrillPrepScreenProps {
  question: string;
  suggestedAnswer: string | null;
  onStart: (stream: MediaStream) => void;
}

export function DrillPrepScreen({
  question,
  suggestedAnswer,
  onStart,
}: DrillPrepScreenProps) {
  const webcamRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedRef = useRef(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);

  const initMedia = useCallback(async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
      }
      setMediaReady(true);
    } catch (err) {
      const e = err as DOMException;
      if (e.name === "NotAllowedError") {
        setPermissionError(
          "카메라와 마이크 접근이 거부되었습니다. 브라우저 설정에서 권한을 허용해 주세요",
        );
      } else if (e.name === "NotFoundError") {
        setPermissionError("카메라 또는 마이크를 찾을 수 없습니다");
      } else {
        setPermissionError("카메라 연결에 실패했습니다");
      }
    }
  }, []);

  useEffect(() => {
    initMedia();
    return () => {
      if (!startedRef.current && streamRef.current) {
        for (const t of streamRef.current.getTracks()) {
          t.stop();
        }
        if (webcamRef.current) {
          webcamRef.current.srcObject = null;
        }
      }
    };
  }, [initMedia]);

  const handleStart = useCallback(() => {
    if (!streamRef.current) {
      initMedia();
      return;
    }
    startedRef.current = true;
    onStart(streamRef.current);
  }, [initMedia, onStart]);

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl space-y-6">
        {/* Question text */}
        <div className="text-center">
          <h1 className="text-xl font-bold leading-relaxed">{question}</h1>
        </div>

        {/* Camera preview */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-card border border-white/[0.06]">
          <video
            ref={webcamRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!mediaReady && !permissionError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
            </div>
          )}
          {permissionError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card p-6 text-center">
              <p className="text-sm text-red-400">{permissionError}</p>
              <button
                type="button"
                onClick={initMedia}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-white/[0.06] hover:bg-card-hover transition-colors cursor-pointer"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>

        {/* Suggested answer collapsible panel */}
        {suggestedAnswer && (
          <button
            type="button"
            className="w-full rounded-xl bg-card border border-white/[0.06] p-5 cursor-pointer select-none text-left"
            onClick={() => setExpanded((prev) => !prev)}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-secondary">
                모범 답안 참고
              </span>
              <svg
                width={16}
                height={16}
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="text-muted transition-transform duration-200"
                style={{
                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            {expanded && (
              <p className="mt-3 text-sm text-secondary leading-relaxed">
                {suggestedAnswer}
              </p>
            )}
          </button>
        )}

        {/* Start button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleStart}
            disabled={!mediaReady}
            className={cn(
              "px-8 py-3 rounded-xl text-base font-semibold transition-all",
              mediaReady
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 cursor-pointer"
                : "bg-card border border-white/[0.06] text-muted cursor-not-allowed",
            )}
          >
            연습 시작
          </button>
        </div>
      </div>
    </div>
  );
}
