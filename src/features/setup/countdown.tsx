"use client";

import { cn } from "@/shared/lib/cn";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

type StepStatus = "pending" | "loading" | "done" | "error";

interface Step {
  label: string;
  status: StepStatus;
}

interface CountdownProps {
  researchStatus: "idle" | "loading" | "done";
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
  return <div className="w-5 h-5 rounded-full bg-white/[0.06]" />;
}

export function Countdown({ researchStatus, onComplete }: CountdownProps) {
  const [steps, setSteps] = useState<Step[]>([
    { label: "직무 분석", status: "loading" },
    { label: "면접 질문 최적화", status: "pending" },
  ]);
  const [ready, setReady] = useState(false);
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
    if (researchStatus !== "done") return;

    updateStep(0, "done");
    updateStep(1, "loading");

    const timer = setTimeout(() => {
      updateStep(1, "done");
      setReady(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [researchStatus, updateStep]);

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
