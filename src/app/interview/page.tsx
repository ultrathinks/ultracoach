"use client";

import { useSessionStore } from "@/entities/session";
import { Countdown, SetupForm, useJobResearch } from "@/features/setup";
import { InterviewScreen } from "@/widgets/interview/interview-screen";
import { useCallback, useState } from "react";

type Stage = "setup" | "countdown" | "interview";

export default function InterviewPage() {
  const [stage, setStage] = useState<Stage>("setup");
  const reset = useSessionStore((s) => s.reset);
  const research = useJobResearch();

  const handleStart = useCallback(() => {
    research.start();
    setStage("countdown");
  }, [research]);

  const handleCountdownComplete = useCallback(() => {
    setStage("interview");
  }, []);

  if (stage === "countdown") {
    return (
      <Countdown
        researchStatus={research.status}
        onComplete={handleCountdownComplete}
      />
    );
  }

  if (stage === "interview") {
    return <InterviewScreen />;
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-6">
      <SetupForm onStart={handleStart} />
    </div>
  );
}
