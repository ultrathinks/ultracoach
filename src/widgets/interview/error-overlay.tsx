"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useSessionStore } from "@/entities/session";
import { Button } from "@/shared/ui";

interface ErrorOverlayProps {
  onRetry: () => void;
  onEnd: () => void;
}

export function ErrorOverlay({ onRetry, onEnd }: ErrorOverlayProps) {
  const t = useTranslations("interview");
  const phase = useSessionStore((s) => s.phase);
  const error = useSessionStore((s) => s.error);

  if (phase !== "paused" && phase !== "error") return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="glass rounded-2xl p-8 max-w-md mx-4 text-center space-y-4">
        {phase === "paused" && (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-yellow/20 flex items-center justify-center">
              <span className="text-yellow text-xl">⏸</span>
            </div>
            <h2 className="text-lg font-semibold">{t("errors.pausedTitle")}</h2>
            <p className="text-sm text-secondary">
              {error?.type === "network"
                ? t("errors.network")
                : error?.type === "api"
                  ? t("errors.api")
                  : t("errors.fallback")}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="secondary" onClick={onEnd}>
                {t("errors.endInterview")}
              </Button>
              <Button onClick={onRetry}>{t("errors.retry")}</Button>
            </div>
          </>
        )}
        {phase === "error" && (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-red/20 flex items-center justify-center">
              <span className="text-red text-xl">✕</span>
            </div>
            <h2 className="text-lg font-semibold">{t("errors.errorTitle")}</h2>
            <p className="text-sm text-secondary">
              {error?.type === "permission"
                ? t("errors.permission")
                : (error?.message ?? t("errors.fatal"))}
            </p>
            <Button onClick={onEnd}>{t("errors.endInterview")}</Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
