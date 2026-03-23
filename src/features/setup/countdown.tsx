"use client";

import { cn } from "@/shared/lib/cn";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useJobResearch } from "./use-job-research";

type StepStatus = "pending" | "loading" | "done" | "error";

interface Step {
  label: string;
  status: StepStatus;
}

interface CountdownProps {
  onComplete: () => void;
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "loading") {
    return (
      <div className="w-5 h-5 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
    );
  }
  if (status === "done") {
    return (
      <div className="w-5 h-5 rounded-full bg-green/15 flex items-center justify-center">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-green)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="w-5 h-5 rounded-full bg-red/15 flex items-center justify-center">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-red)"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </div>
    );
  }
  return <div className="w-5 h-5 rounded-full bg-white/[0.06]" />;
}

export function Countdown({ onComplete }: CountdownProps) {
  const { status: researchStatus, start: startResearch } = useJobResearch();
  const [steps, setSteps] = useState<Step[]>([
    { label: "직무 분석", status: "pending" },
    { label: "면접 질문 최적화", status: "pending" },
  ]);
  const [ready, setReady] = useState(false);
  const didRun = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const updateStep = useCallback(
    (index: number, status: StepStatus) => {
      setSteps((prev) =>
        prev.map((s, i) => (i === index ? { ...s, status } : s)),
      );
    },
    [],
  );

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    updateStep(0, "loading");
    startResearch();
  }, [startResearch, updateStep]);

  // 직무 분석 상태 반영
  useEffect(() => {
    if (researchStatus === "done") {
      updateStep(0, "done");
      updateStep(1, "loading");
      // 질문 최적화는 직무 분석 결과 기반이므로 바로 완료 처리
      const timer = setTimeout(() => {
        updateStep(1, "done");
        setReady(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [researchStatus, updateStep]);

  // 준비 완료 후 전환
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      onCompleteRef.current();
    }, 600);
    return () => clearTimeout(timer);
  }, [ready]);

  const allDone = steps.every((s) => s.status === "done");

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center">
      <motion.div
        className="w-full max-w-sm px-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-center mb-12">
          {allDone ? "면접을 시작합니다" : "면접을 준비하고 있어요"}
        </h2>

        <div className="space-y-5">
          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15, duration: 0.3 }}
            >
              <StepIcon status={step.status} />
              <span
                className={cn(
                  "text-base transition-colors",
                  step.status === "done" && "text-foreground",
                  step.status === "loading" && "text-secondary",
                  step.status === "pending" && "text-muted",
                  step.status === "error" && "text-red",
                )}
              >
                {step.label}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
