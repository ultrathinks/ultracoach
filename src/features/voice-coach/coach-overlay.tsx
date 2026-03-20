"use client";

import { cn } from "@/shared/lib/cn";
import { AnimatePresence, motion } from "motion/react";
import { useVoiceCoach } from "./use-voice-coach";

const typeColors: Record<string, string> = {
  gaze: "from-blue to-indigo",
  posture: "from-purple to-pink",
  expression: "from-yellow to-red",
  gesture: "from-green to-blue",
};

export function CoachOverlay() {
  const { activeCoaching, positiveMessage } = useVoiceCoach();

  return (
    <div className="absolute top-20 left-6 z-20">
      <AnimatePresence>
        {activeCoaching && (
          <motion.div
            key={`coaching-${activeCoaching.type}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={cn(
              "glass rounded-xl px-4 py-2.5 flex items-center gap-2",
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full bg-gradient-to-r",
                typeColors[activeCoaching.type],
              )}
            />
            <span className="text-sm font-medium">
              {activeCoaching.message}
            </span>
          </motion.div>
        )}
        {positiveMessage && !activeCoaching && (
          <motion.div
            key="positive"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass rounded-xl px-4 py-2.5 flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-green" />
            <span className="text-sm font-medium text-green">
              {positiveMessage}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
