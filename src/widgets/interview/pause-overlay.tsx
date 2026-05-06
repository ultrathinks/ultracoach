"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useSessionStore } from "@/entities/session";
import { Button } from "@/shared/ui";

interface PauseOverlayProps {
  onResume: () => void;
}

export function PauseOverlay({ onResume }: PauseOverlayProps) {
  const t = useTranslations("interview");
  const userPaused = useSessionStore((s) => s.userPaused);

  if (!userPaused) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="bg-background/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 max-w-sm mx-4 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-yellow/15 flex items-center justify-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="var(--color-yellow)"
            aria-hidden="true"
          >
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold">{t("pause.title")}</h2>
        <p className="text-sm text-secondary">{t("pause.subtitle")}</p>
        <Button onClick={onResume} className="w-full">
          {t("controls.resume")}
        </Button>
      </div>
    </motion.div>
  );
}
