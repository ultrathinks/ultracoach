"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";
import type { DeviceOption } from "@/features/setup/use-devices";
import { Select } from "@/shared/ui";

interface DevicePanelProps {
  open: boolean;
  onClose: () => void;
  mics: DeviceOption[];
  speakers: DeviceOption[];
  cams: DeviceOption[];
  audioInputId: string | null;
  audioOutputId: string | null;
  videoInputId: string | null;
  supportsSinkId: boolean;
  onChangeMic: (deviceId: string) => void;
  onChangeSpeaker: (deviceId: string) => void;
  onChangeCam: (deviceId: string) => void;
}

function toOptions(devices: DeviceOption[], defaultLabel: string) {
  return [
    { value: "", label: defaultLabel },
    ...devices.map((d) => ({ value: d.deviceId, label: d.label })),
  ];
}

async function playTestBeep(deviceId: string | null) {
  const Ctor =
    typeof window !== "undefined"
      ? (window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext)
      : null;
  if (!Ctor) return;

  const ctx = new Ctor();
  const dest = ctx.createMediaStreamDestination();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 440;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.38);
  osc.connect(gain);
  gain.connect(dest);

  const audio = new Audio();
  audio.srcObject = dest.stream;
  if (deviceId && typeof audio.setSinkId === "function") {
    try {
      await audio.setSinkId(deviceId);
    } catch (err) {
      console.warn("setSinkId failed:", err);
    }
  }

  osc.start();
  try {
    await audio.play();
  } catch (err) {
    console.warn("test beep play failed:", err);
  }

  setTimeout(() => {
    osc.stop();
    audio.pause();
    audio.srcObject = null;
    void ctx.close();
  }, 450);
}

export function DevicePanel({
  open,
  onClose,
  mics,
  speakers,
  cams,
  audioInputId,
  audioOutputId,
  videoInputId,
  supportsSinkId,
  onChangeMic,
  onChangeSpeaker,
  onChangeCam,
}: DevicePanelProps) {
  const t = useTranslations("interview.device");
  const ref = useRef<HTMLDivElement>(null);
  const defaultLabel = t("default");

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [open, onClose]);

  const handleTestSpeaker = useCallback(() => {
    void playTestBeep(audioOutputId);
  }, [audioOutputId]);

  if (!open) return null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-80 rounded-2xl bg-background/80 backdrop-blur-xl border border-white/[0.06] p-5 space-y-4 shadow-2xl"
      role="dialog"
      aria-label={t("title")}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("title")}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>

      <Select
        label={t("mic")}
        options={toOptions(mics, defaultLabel)}
        value={audioInputId ?? ""}
        onChange={(e) => onChangeMic(e.target.value)}
      />

      <div>
        <Select
          label={t("speaker")}
          options={toOptions(speakers, defaultLabel)}
          value={audioOutputId ?? ""}
          onChange={(e) => onChangeSpeaker(e.target.value)}
          disabled={!supportsSinkId}
        />
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestSpeaker}
            disabled={!supportsSinkId && !!audioOutputId}
            className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <polygon points="6 4 20 12 6 20" />
            </svg>
            {t("test")}
          </button>
          {!supportsSinkId && (
            <span className="text-xs text-muted">{t("noSinkSupport")}</span>
          )}
        </div>
      </div>

      <Select
        label={t("cam")}
        options={toOptions(cams, defaultLabel)}
        value={videoInputId ?? ""}
        onChange={(e) => onChangeCam(e.target.value)}
      />
    </motion.div>
  );
}
