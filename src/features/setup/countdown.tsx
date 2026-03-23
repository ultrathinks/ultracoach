"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useJobResearch } from "./use-job-research";

interface CountdownProps {
  onComplete: () => void;
}

export function Countdown({ onComplete }: CountdownProps) {
  const [count, setCount] = useState(3);
  const { status, start } = useJobResearch();
  const startedRef = useRef(false);
  const countdownDoneRef = useRef(false);

  // Start research on mount
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      start();
    }
  }, [start]);

  // Countdown timer
  useEffect(() => {
    if (count === 0) {
      countdownDoneRef.current = true;
      return;
    }
    const timer = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(timer);
  }, [count]);

  // Complete when both countdown and research are done
  useEffect(() => {
    if (countdownDoneRef.current && status === "done") {
      onComplete();
    }
  }, [count, status, onComplete]);

  const showResearching = count === 0 && status === "loading";

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={showResearching ? "researching" : count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="text-7xl font-bold gradient-text"
        >
          {showResearching ? (
            <span className="text-2xl">직무 분석 중...</span>
          ) : count > 0 ? (
            count
          ) : (
            "시작"
          )}
        </motion.div>
      </AnimatePresence>
      <p className="text-muted text-sm mt-8">
        {showResearching
          ? "면접 질문을 최적화하고 있습니다"
          : "카메라와 마이크를 준비하세요"}
      </p>
    </div>
  );
}
