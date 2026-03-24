"use client";

import { useSessionStore } from "@/entities/session";
import { SetupForm, useJobResearch } from "@/features/setup";
import { InterviewScreen } from "@/widgets/interview/interview-screen";
import { useCallback, useState } from "react";

type Stage = "setup" | "interview";

export default function InterviewPage() {
  const [stage, setStage] = useState<Stage>("setup");
  const reset = useSessionStore((s) => s.reset);
  const research = useJobResearch();

  const handleStart = useCallback(() => {
    research.start();
    setStage("interview");
  }, [research]);

  if (stage === "interview") {
    return <InterviewScreen researchStatus={research.status} />;
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-6">
      <SetupForm onStart={handleStart} />
    </div>
  );
}
