"use client";

import { useSessionStore } from "@/entities/session";
import { Button } from "@/shared/ui";
import { motion } from "motion/react";

interface ErrorOverlayProps {
  onRetry: () => void;
  onEnd: () => void;
}

export function ErrorOverlay({ onRetry, onEnd }: ErrorOverlayProps) {
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
            <h2 className="text-lg font-semibold">일시 중지됨</h2>
            <p className="text-sm text-secondary">
              {error?.type === "network"
                ? "네트워크 연결을 확인하세요"
                : error?.type === "api"
                  ? "서버 응답에 문제가 있습니다"
                  : "잠시 후 다시 시도해주세요"}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={onEnd}>
                면접 종료
              </Button>
              <Button onClick={onRetry}>재시도</Button>
            </div>
          </>
        )}
        {phase === "error" && (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-red/20 flex items-center justify-center">
              <span className="text-red text-xl">✕</span>
            </div>
            <h2 className="text-lg font-semibold">문제가 발생했습니다</h2>
            <p className="text-sm text-secondary">
              {error?.type === "permission"
                ? "카메라/마이크 접근이 필요합니다. 브라우저 설정에서 권한을 허용해주세요."
                : error?.message ?? "면접을 계속할 수 없습니다"}
            </p>
            <Button onClick={onEnd}>면접 종료</Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
