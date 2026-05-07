"use client";

import { useTranslations } from "next-intl";

export function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted";
  if (score >= 80) return "text-green";
  if (score >= 60) return "text-yellow";
  return "text-red";
}

export function useFormatDuration() {
  const t = useTranslations("common");
  return (sec: number | null): string => {
    if (sec === null || sec <= 0) return "-";
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return t("durationMs", { minutes, seconds });
  };
}
