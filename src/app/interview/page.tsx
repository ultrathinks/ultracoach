"use client";

import { useSessionStore } from "@/entities/session";
import { Countdown, SetupForm } from "@/features/setup";
import { InterviewScreen } from "@/widgets/interview/interview-screen";
import { useCallback, useState } from "react";

type Stage = "setup" | "countdown" | "interview";

export default function InterviewPage() {
  const [stage, setStage] = useState<Stage>("setup");
  const reset = useSessionStore((s) => s.reset);

  const handleStart = useCallback(() => {
    setStage("countdown");
  }, []);

  const handleCountdownComplete = useCallback(() => {
    setStage("interview");
  }, []);

  if (stage === "countdown") {
    return (
      <div className="px-6 py-12">
        <Countdown onComplete={handleCountdownComplete} />
      </div>
    );
  }

  if (stage === "interview") {
    return <InterviewScreen />;
  }

  return (
    <div className="px-6 py-12">
      <SetupForm onStart={handleStart} />
    </div>
  );
}
