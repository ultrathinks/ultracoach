"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSessionStore } from "@/entities/session";
import { calibrateVad } from "@/shared/lib/vad";
import { Badge, Button, Card, PageContainer } from "@/shared/ui";

type CheckId = "mic" | "camera" | "noise" | "network";
type CheckState = "idle" | "running" | "ok" | "warn" | "fail";

interface CheckRow {
  id: CheckId;
  state: CheckState;
  detail: string | null;
}

interface PrecheckScreenProps {
  onComplete: () => void;
}

const NOISE_THRESHOLD_WARN = 0.05;
const NETWORK_THRESHOLD_MS = 250;

export function PrecheckScreen({ onComplete }: PrecheckScreenProps) {
  const t = useTranslations("precheck");
  const setCalibratedThreshold = useSessionStore(
    (s) => s.setCalibratedVadThreshold,
  );
  const [checks, setChecks] = useState<CheckRow[]>([
    { id: "mic", detail: null, state: "idle" },
    { id: "camera", detail: null, state: "idle" },
    { id: "noise", detail: null, state: "idle" },
    { id: "network", detail: null, state: "idle" },
  ]);
  const [running, setRunning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const updateCheck = useCallback(
    (id: CheckId, partial: Partial<Omit<CheckRow, "id">>) => {
      setChecks((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...partial } : c)),
      );
    },
    [],
  );

  const runChecks = useCallback(async () => {
    setRunning(true);

    updateCheck("mic", {
      state: "running",
      detail: t("details.permissionChecking"),
    });
    updateCheck("camera", {
      state: "running",
      detail: t("details.permissionChecking"),
    });
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: true,
      });
      streamRef.current = stream;
      updateCheck("mic", {
        state: "ok",
        detail: t("details.permissionGranted"),
      });
      updateCheck("camera", {
        state: "ok",
        detail: t("details.cameraDetected"),
      });
    } catch {
      updateCheck("mic", {
        state: "fail",
        detail: t("details.permissionDenied"),
      });
      updateCheck("camera", {
        state: "fail",
        detail: t("details.permissionRequired"),
      });
      setRunning(false);
      return;
    }

    updateCheck("noise", {
      state: "running",
      detail: t("details.noiseMeasuring"),
    });
    try {
      const threshold = await calibrateVad(stream, 2000);
      setCalibratedThreshold(threshold);
      const isQuiet = threshold <= NOISE_THRESHOLD_WARN;
      updateCheck("noise", {
        state: isQuiet ? "ok" : "warn",
        detail: isQuiet
          ? t("details.noiseQuiet", { value: threshold.toFixed(3) })
          : t("details.noiseLoud", { value: threshold.toFixed(3) }),
      });
    } catch {
      updateCheck("noise", {
        state: "warn",
        detail: t("details.noiseFailed"),
      });
    }

    updateCheck("network", {
      state: "running",
      detail: t("details.networkPing"),
    });
    try {
      const start = performance.now();
      const res = await fetch("/api/health");
      const elapsed = performance.now() - start;
      if (!res.ok) throw new Error("health check failed");
      updateCheck("network", {
        state: elapsed > NETWORK_THRESHOLD_MS ? "warn" : "ok",
        detail: t("details.networkLatency", { ms: Math.round(elapsed) }),
      });
    } catch {
      updateCheck("network", {
        state: "warn",
        detail: t("details.networkNoResponse"),
      });
    }

    setRunning(false);
  }, [setCalibratedThreshold, updateCheck, t]);

  useEffect(() => {
    void runChecks();
    return () => {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, [runChecks]);

  const allOk = checks.every((c) => c.state === "ok" || c.state === "warn");
  const hasFail = checks.some((c) => c.state === "fail");

  return (
    <PageContainer size="form" className="px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        <p className="text-sm text-secondary">{t("subtitle")}</p>
      </div>

      <Card className="p-6 space-y-2">
        {checks.map((c) => (
          <div
            key={c.id}
            className="flex items-start justify-between gap-4 py-2"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{t(`checks.${c.id}`)}</p>
              {c.detail && (
                <p className="text-xs text-muted mt-1">{c.detail}</p>
              )}
            </div>
            <CheckBadge state={c.state} />
          </div>
        ))}
      </Card>

      <div className="mt-8 flex gap-2">
        <Button
          variant="secondary"
          onClick={runChecks}
          disabled={running}
          className="flex-1"
        >
          {t("rerun")}
        </Button>
        <Button
          onClick={onComplete}
          disabled={!allOk || hasFail}
          className="flex-1"
        >
          {t("start")}
        </Button>
      </div>
    </PageContainer>
  );
}

function CheckBadge({ state }: { state: CheckState }) {
  const t = useTranslations("precheck.states");
  switch (state) {
    case "running":
      return <Badge tone="indigo">{t("running")}</Badge>;
    case "ok":
      return <Badge tone="green">{t("ok")}</Badge>;
    case "warn":
      return <Badge tone="yellow">{t("warn")}</Badge>;
    case "fail":
      return <Badge tone="red">{t("fail")}</Badge>;
    default:
      return <Badge>{t("idle")}</Badge>;
  }
}
