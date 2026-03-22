"use client";

import type { InterviewConfig } from "@/entities/session";
import { useMetricsStore } from "@/entities/metrics";
import { useSessionStore } from "@/entities/session";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInterventionEngine,
  type Intervention,
} from "./intervention-engine";

export function useVoiceCoach(config?: InterviewConfig) {
  const engineRef = useRef(createInterventionEngine());

  useEffect(() => {
    if (!config) return;
    engineRef.current = createInterventionEngine({
      cooldown: config.coachingCooldown,
      minInterval: config.coachingMinInterval,
      triggerDuration: config.coachingTriggerDuration,
    });
  }, [
    config?.coachingCooldown,
    config?.coachingMinInterval,
    config?.coachingTriggerDuration,
  ]);
  const [activeCoaching, setActiveCoaching] = useState<Intervention | null>(
    null,
  );
  const [positiveMessage, setPositiveMessage] = useState<string | null>(null);
  const lastPositiveTime = useRef(0);

  const phase = useSessionStore((s) => s.phase);
  const mode = useSessionStore((s) => s.mode);
  const latest = useMetricsStore((s) => s.latest);
  const addEvent = useMetricsStore((s) => s.addEvent);

  const positiveInterval = config?.positiveInterval ?? 60;

  useEffect(() => {
    if (mode !== "practice" || !latest || phase !== "listening") return;

    const intervention = engineRef.current.evaluate(latest, false);

    if (intervention) {
      setActiveCoaching(intervention);
      addEvent({
        timestamp: latest.timestamp,
        type: intervention.type,
        message: intervention.message,
      });

      const utterance = new SpeechSynthesisUtterance(intervention.message);
      utterance.lang = "ko-KR";
      utterance.rate = 1.2;
      utterance.volume = 0.7;
      speechSynthesis.speak(utterance);

      setTimeout(() => setActiveCoaching(null), 3000);
    }

    const now = Date.now() / 1000;
    if (
      !intervention &&
      latest.gaze.isFrontFacing &&
      latest.posture.isUpright &&
      latest.expression.isPositiveOrNeutral &&
      latest.gesture.isModerate &&
      now - lastPositiveTime.current > positiveInterval
    ) {
      lastPositiveTime.current = now;
      setPositiveMessage("좋아요, 잘하고 있어요");
      setTimeout(() => setPositiveMessage(null), 3000);
    }
  }, [latest, phase, mode, addEvent, positiveInterval]);

  const reset = useCallback(() => {
    engineRef.current.reset();
    setActiveCoaching(null);
    setPositiveMessage(null);
  }, []);

  return { activeCoaching, positiveMessage, reset };
}
