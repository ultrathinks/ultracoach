"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import type { QuestionAnalysis, SessionFeedback } from "@/entities/feedback";
import { identifyWeakAnswers } from "@/entities/feedback";
import { cn } from "@/shared/lib/cn";
import { ScoreRing } from "./score-ring";

interface ReportViewProps {
  feedback: SessionFeedback;
  jobTitle: string;
  duration: number;
  sessionId: string;
}

function WeakAnswerItem({
  qa,
  sessionId,
}: {
  qa: QuestionAnalysis;
  sessionId: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const answerPreview = qa.answer
    ? qa.answer.length > 100
      ? `${qa.answer.slice(0, 100).trimEnd()}...`
      : qa.answer
    : "";

  return (
    <div className="space-y-3">
      {/* question header + score */}
      <div className="flex items-start gap-3">
        <span className="text-sm text-muted shrink-0 w-8">
          Q{qa.questionId}
        </span>
        <span className="font-medium text-base flex-1">{qa.questionText}</span>
        <span
          className={cn(
            "shrink-0 text-sm font-medium",
            qa.contentScore >= 60 ? "text-yellow" : "text-red",
          )}
        >
          {qa.contentScore}점
        </span>
      </div>

      {/* STAR badges */}
      <div className="flex items-center gap-1.5 ml-11">
        {(["situation", "task", "action", "result"] as const).map((key) => (
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
      </div>

      {/* answer preview */}
      {answerPreview && (
        <p className="text-sm text-foreground/50 ml-11 leading-relaxed">
          "{answerPreview}"
        </p>
      )}

      {/* AI feedback */}
      <p className="text-[15px] text-foreground/70 leading-relaxed ml-11">
        {qa.feedback}
      </p>

      {/* suggested answer fold/unfold */}
      {qa.suggestedAnswer && (
        <div className="ml-11">
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-indigo hover:text-indigo/80 transition-colors"
            onClick={() => setExpanded((prev) => !prev)}
          >
            <span>모범 답안 보기</span>
            <svg
              width={14}
              height={14}
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="transition-transform duration-200"
              style={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {expanded && (
            <div className="mt-3 border-l-[3px] border-l-indigo/50 bg-white/[0.02] rounded-r-lg px-4 py-3">
              <p className="text-sm text-foreground/70 leading-relaxed">
                {qa.suggestedAnswer}
              </p>
            </div>
          )}
        </div>
      )}

      {/* drill CTA */}
      <div className="ml-11">
        <Link
          href={`/drill/${sessionId}?q=${qa.questionId}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo via-purple to-pink text-white hover:opacity-90 transition-opacity"
        >
          재연습하기
        </Link>
      </div>
    </div>
  );
}

export function ReportView({
  feedback,
  jobTitle,
  duration,
  sessionId,
}: ReportViewProps) {
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}분 ${s}초`;
  };

  const weakAnswers = identifyWeakAnswers(feedback.questionAnalyses);
  const hasAnySuggestedAnswer = feedback.questionAnalyses.some(
    (qa) => qa.suggestedAnswer !== undefined && qa.suggestedAnswer !== "",
  );

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
          <p className="text-foreground/80 text-base leading-relaxed">
            {feedback.summary}
          </p>
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

      {/* weak answers */}
      {hasAnySuggestedAnswer && weakAnswers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <div className="rounded-xl bg-card border border-yellow/20 p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <span className="text-yellow">&#9888;</span>
              아쉬운 답변
            </h2>
            <div className="space-y-6">
              {weakAnswers.map((qa) => (
                <WeakAnswerItem
                  key={qa.questionId}
                  qa={qa}
                  sessionId={sessionId}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* question analyses */}
      {feedback.questionAnalyses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <div className="rounded-xl bg-card border border-white/[0.06] p-6">
            <h2 className="text-lg font-semibold mb-6">질문별 분석</h2>
            <div className="space-y-8">
              {feedback.questionAnalyses.map((qa) => (
                <div key={qa.questionId} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-muted shrink-0 w-8">
                      Q{qa.questionId}
                    </span>
                    <span className="font-medium text-base">
                      {qa.questionText}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-11">
                    {(["situation", "task", "action", "result"] as const).map(
                      (key) => (
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
                      ),
                    )}
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
        transition={{ delay: 0.65 }}
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

      {/* dashboard link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
        className="flex justify-center"
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-medium bg-white/[0.06] border border-white/[0.06] hover:bg-white/[0.1] transition-colors"
        >
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          대시보드로 가기
        </Link>
      </motion.div>
    </div>
  );
}
