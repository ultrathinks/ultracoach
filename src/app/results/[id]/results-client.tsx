"use client";

import { sessionFeedbackSchema } from "@/entities/feedback";
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

  const result = sessionFeedbackSchema.safeParse(feedback.summaryJson);
  if (!result.success) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold mb-2">
          피드백 데이터가 손상되었습니다
        </h1>
        <p className="text-muted">결과를 표시할 수 없습니다</p>
      </div>
    );
  }

  return (
    <ReportView
      feedback={result.data}
      jobTitle={session.jobTitle}
      duration={session.durationSec ?? 0}
      sessionId={session.id}
    />
  );
}
