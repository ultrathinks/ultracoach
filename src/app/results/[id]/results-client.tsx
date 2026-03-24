"use client";

import type { SessionFeedback } from "@/entities/feedback";
import { ReportView } from "@/widgets/report/report-view";

interface ResultsClientProps {
  session: {
    id: string;
    jobTitle: string;
    durationSec: number | null;
  };
  feedback: {
    summaryJson: unknown;
    keyMomentsJson: unknown;
    actionItemsJson: unknown;
    questionAnalysesJson: unknown;
  } | null;
}

export function ResultsClient({ session, feedback }: ResultsClientProps) {
  if (!feedback) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold mb-2">피드백을 찾을 수 없습니다</h1>
        <p className="text-muted">면접 결과가 아직 생성되지 않았습니다</p>
      </div>
    );
  }

  const parsed = feedback.summaryJson as SessionFeedback;

  return (
    <ReportView
      feedback={parsed}
      jobTitle={session.jobTitle}
      duration={session.durationSec ?? 0}
    />
  );
}
