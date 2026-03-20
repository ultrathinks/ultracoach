"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

interface CountdownProps {
  onComplete: () => void;
}

export function Countdown({ onComplete }: CountdownProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count === 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="text-7xl font-bold gradient-text"
        >
          {count > 0 ? count : "시작"}
        </motion.div>
      </AnimatePresence>
      <p className="text-muted text-sm mt-8">카메라와 마이크를 준비하세요</p>
    </div>
  );
}
