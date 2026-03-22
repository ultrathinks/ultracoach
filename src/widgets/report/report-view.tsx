"use client";

import type { SessionFeedback } from "@/entities/feedback";
import { Card } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { motion } from "motion/react";
import { ScoreRing } from "./score-ring";

interface ReportViewProps {
  feedback: SessionFeedback;
  jobTitle: string;
  duration: number;
}

export function ReportView({ feedback, jobTitle, duration }: ReportViewProps) {
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}분 ${s}초`;
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold mb-1">면접 리포트</h1>
        <p className="text-secondary text-sm">
          {jobTitle} · {formatDuration(duration)}
        </p>
      </motion.div>

      {/* scores */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="flex items-center justify-center gap-12 py-8">
          <ScoreRing score={feedback.deliveryScore} label="전달력" />
          <ScoreRing score={feedback.contentScore} label="답변력" />
        </Card>
      </motion.div>

      {/* summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <h2 className="font-semibold mb-2">종합 평가</h2>
          <p className="text-sm text-secondary">{feedback.summary}</p>
        </Card>
      </motion.div>

      {/* key moments */}
      {feedback.keyMoments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <h2 className="font-semibold mb-3">핵심 순간</h2>
            <div className="space-y-2">
              {feedback.keyMoments.map((moment) => (
                <div
                  key={`${moment.timestamp}-${moment.type}`}
                  className="flex items-start gap-3 text-sm"
                >
                  <span
                    className={cn(
                      "shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs",
                      moment.type === "positive"
                        ? "bg-green/20 text-green"
                        : "bg-red/20 text-red",
                    )}
                  >
                    {moment.type === "positive" ? "+" : "-"}
                  </span>
                  <span className="text-secondary">{moment.description}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* action items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <h2 className="font-semibold mb-3">고칠 것 3가지</h2>
          <div className="space-y-2">
            {feedback.actionItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-indigo/20 text-indigo flex items-center justify-center text-xs font-medium">
                  {item.id}
                </span>
                <span className="text-secondary">{item.text}</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* question analyses */}
      {feedback.questionAnalyses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <h2 className="font-semibold mb-4">질문별 분석</h2>
            <div className="space-y-6">
              {feedback.questionAnalyses.map((qa) => (
                <div key={qa.questionId} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-secondary">
                      Q{qa.questionId}
                    </span>
                    <span className="text-sm font-medium">
                      {qa.questionText}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {(
                      ["situation", "task", "action", "result"] as const
                    ).map((key) => (
                      <span
                        key={key}
                        className={cn(
                          "px-2 py-0.5 rounded text-xs",
                          qa.starFulfillment[key]
                            ? "bg-green/20 text-green"
                            : "bg-card text-muted",
                        )}
                      >
                        {key[0].toUpperCase()}
                      </span>
                    ))}
                    <span className="ml-auto text-xs text-secondary">
                      {qa.contentScore}점
                    </span>
                  </div>
                  <p className="text-xs text-secondary">{qa.feedback}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* next suggestion */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="gradient-border">
          <h2 className="font-semibold mb-1">다음 세션 제안</h2>
          <p className="text-sm text-secondary">
            {feedback.nextSessionSuggestion}
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
