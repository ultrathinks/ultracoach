"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

export interface DeviceOption {
  deviceId: string;
  label: string;
}

interface DeviceState {
  mics: DeviceOption[];
  speakers: DeviceOption[];
  cams: DeviceOption[];
}

const empty: DeviceState = { mics: [], speakers: [], cams: [] };

function detectSinkSupport(): boolean {
  if (typeof document === "undefined") return false;
  const audio = document.createElement("audio");
  return typeof audio.setSinkId === "function";
}

function toOption(d: MediaDeviceInfo, fallbackPrefix: string): DeviceOption {
  const label =
    d.label && d.label.trim().length > 0
      ? d.label
      : `${fallbackPrefix} ${d.deviceId.slice(0, 6) || "default"}`;
  return { deviceId: d.deviceId, label };
}

export function useDevices() {
  const t = useTranslations("interview.device");
  const [devices, setDevices] = useState<DeviceState>(empty);
  const [supportsSinkId, setSupportsSinkId] = useState(false);

  const refresh = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      return;
    }
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const mics: DeviceOption[] = [];
      const speakers: DeviceOption[] = [];
      const cams: DeviceOption[] = [];
      for (const d of list) {
        if (d.kind === "audioinput") mics.push(toOption(d, t("mic")));
        else if (d.kind === "audiooutput")
          speakers.push(toOption(d, t("speaker")));
        else if (d.kind === "videoinput") cams.push(toOption(d, t("cam")));
      }
      setDevices({ mics, speakers, cams });
    } catch (err) {
      console.warn("enumerate devices failed:", err);
    }
  }, [t]);

  useEffect(() => {
    setSupportsSinkId(detectSinkSupport());
    void refresh();
    const handler = () => {
      void refresh();
    };
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
    };
  }, [refresh]);

  return {
    mics: devices.mics,
    speakers: devices.speakers,
    cams: devices.cams,
    refresh,
    supportsSinkId,
  };
}

export async function requestMediaPermission(): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    for (const t of stream.getTracks()) t.stop();
    return true;
  } catch {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const t of stream.getTracks()) t.stop();
      return true;
    } catch {
      return false;
    }
  }
}
