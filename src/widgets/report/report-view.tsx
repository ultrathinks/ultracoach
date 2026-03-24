"use client";

import type { SessionFeedback } from "@/entities/feedback";
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
    <div className="max-w-4xl mx-auto px-6 py-20 lg:py-28 space-y-10">
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold mb-3">면접 리포트</h1>
        <p className="text-muted text-lg">
          {jobTitle} · {formatDuration(duration)}
        </p>
      </motion.div>

      {/* scores */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="rounded-xl bg-card border border-white/[0.06] flex items-center justify-center gap-16 py-10">
          <ScoreRing score={feedback.deliveryScore} label="전달력" />
          <ScoreRing score={feedback.contentScore} label="답변력" />
        </div>
      </motion.div>

      {/* summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="rounded-xl bg-card border border-white/[0.06] p-6">
          <h2 className="text-lg font-semibold mb-3">종합 평가</h2>
          <p className="text-foreground/80 text-base leading-relaxed">{feedback.summary}</p>
        </div>
      </motion.div>

      {/* key moments */}
      {feedback.keyMoments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="rounded-xl bg-card border border-white/[0.06] p-6">
            <h2 className="text-lg font-semibold mb-4">핵심 순간</h2>
            <div className="space-y-3">
              {feedback.keyMoments.map((moment) => (
                <div
                  key={`${moment.timestamp}-${moment.type}`}
                  className={cn(
                    "border-l-[3px] pl-4 py-1",
                    moment.type === "positive"
                      ? "border-l-green"
                      : "border-l-red",
                  )}
                >
                  <span className="text-foreground/80 text-base leading-relaxed">
                    {moment.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* action items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="rounded-xl bg-card border border-white/[0.06] p-6">
          <h2 className="text-lg font-semibold mb-4">고칠 것 3가지</h2>
          <div className="space-y-4">
            {feedback.actionItems.map((item) => (
              <div key={item.id} className="flex items-start gap-4">
                <span className="shrink-0 text-lg font-bold text-indigo">
                  {item.id}
                </span>
                <span className="text-foreground/80 text-base leading-relaxed">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* question analyses */}
      {feedback.questionAnalyses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="rounded-xl bg-card border border-white/[0.06] p-6">
            <h2 className="text-lg font-semibold mb-6">질문별 분석</h2>
            <div className="space-y-8">
              {feedback.questionAnalyses.map((qa, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-muted shrink-0 w-8">
                      Q{qa.questionId}
                    </span>
                    <span className="font-medium text-base">{qa.questionText}</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-11">
                    {(
                      ["situation", "task", "action", "result"] as const
                    ).map((key) => (
                      <span
                        key={key}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium",
                          qa.starFulfillment[key]
                            ? "bg-green/15 text-green"
                            : "bg-white/[0.04] text-muted",
                        )}
                      >
                        {key[0].toUpperCase()}
                      </span>
                    ))}
                    <span className="ml-auto text-sm text-muted">
                      {qa.contentScore}점
                    </span>
                  </div>
                  <p className="text-[15px] text-foreground/70 leading-relaxed ml-11">
                    {qa.feedback}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* next suggestion */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="gradient-border rounded-xl">
          <div className="rounded-xl bg-background p-8">
            <h2 className="text-xl font-bold mb-3">다음 세션 제안</h2>
            <p className="text-foreground text-base leading-relaxed">
              {feedback.nextSessionSuggestion}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
