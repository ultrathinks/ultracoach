"use client";

import { useMetricsStore } from "@/entities/metrics";
import { useSessionStore } from "@/entities/session";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInterventionEngine,
  type Intervention,
} from "./intervention-engine";

export function useVoiceCoach() {
  const engineRef = useRef(createInterventionEngine());
  const [activeCoaching, setActiveCoaching] = useState<Intervention | null>(
    null,
  );
  const [positiveMessage, setPositiveMessage] = useState<string | null>(null);
  const coachingAudioRef = useRef<AudioContext | null>(null);
  const lastPositiveTime = useRef(0);

  const phase = useSessionStore((s) => s.phase);
  const mode = useSessionStore((s) => s.mode);
  const latest = useMetricsStore((s) => s.latest);
  const addEvent = useMetricsStore((s) => s.addEvent);

  // evaluate metrics on each snapshot
  useEffect(() => {
    if (mode !== "practice" || !latest || phase !== "listening") return;

    const isSpeaking = phase !== "listening";
    const intervention = engineRef.current.evaluate(latest, isSpeaking);

    if (intervention) {
      setActiveCoaching(intervention);
      addEvent({
        timestamp: latest.timestamp,
        type: intervention.type,
        message: intervention.message,
      });

      // speak coaching via SpeechSynthesis (simple approach, no extra API call)
      const utterance = new SpeechSynthesisUtterance(intervention.message);
      utterance.lang = "ko-KR";
      utterance.rate = 1.2;
      utterance.volume = 0.7;
      speechSynthesis.speak(utterance);

      // auto-dismiss after 3s
      setTimeout(() => setActiveCoaching(null), 3000);
    }

    // positive feedback every 60s if all metrics are good
    const now = Date.now() / 1000;
    if (
      !intervention &&
      latest.gaze.isFrontFacing &&
      latest.posture.isUpright &&
      latest.expression.isPositiveOrNeutral &&
      latest.gesture.isModerate &&
      now - lastPositiveTime.current > 60
    ) {
      lastPositiveTime.current = now;
      setPositiveMessage("좋아요, 잘하고 있어요");
      setTimeout(() => setPositiveMessage(null), 3000);
    }
  }, [latest, phase, mode, addEvent]);

  const reset = useCallback(() => {
    engineRef.current.reset();
    setActiveCoaching(null);
    setPositiveMessage(null);
  }, []);

  return { activeCoaching, positiveMessage, reset };
}
