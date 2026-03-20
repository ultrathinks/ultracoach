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
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-4">피드백 생성 중...</h1>
        <p className="text-secondary">잠시 기다려주세요.</p>
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
