"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, FormError, Spinner } from "@/shared/ui";

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
  const t = useTranslations("drill");
  const tCommon = useTranslations("common");
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
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setPermissionError(t("permission.denied"));
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setPermissionError(t("permission.notFound"));
      } else {
        setPermissionError(t("permission.failed"));
      }
    }
  }, [t]);

  useEffect(() => {
    initMedia();
    return () => {
      if (!startedRef.current && streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
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
        <div className="text-center">
          <h1 className="text-xl font-bold leading-relaxed">{question}</h1>
        </div>

        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-card border border-border-subtle">
          <video
            ref={webcamRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!mediaReady && !permissionError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner size="md" />
            </div>
          )}
          {permissionError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card p-6 text-center">
              <FormError>{permissionError}</FormError>
              <Button variant="secondary" size="sm" onClick={initMedia}>
                {tCommon("retry")}
              </Button>
            </div>
          )}
        </div>

        {suggestedAnswer && (
          <button
            type="button"
            className="w-full rounded-xl bg-card border border-border-subtle p-5 cursor-pointer select-none text-left"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-secondary">
                {t("suggestedAnswer")}
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
              <p className="mt-2 text-sm text-secondary leading-relaxed">
                {suggestedAnswer}
              </p>
            )}
          </button>
        )}

        <div className="flex justify-center">
          <Button size="lg" disabled={!mediaReady} onClick={handleStart}>
            {t("start")}
          </Button>
        </div>
      </div>
    </div>
  );
}
