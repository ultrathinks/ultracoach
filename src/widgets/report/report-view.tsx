"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { QuestionAnalysis, SessionFeedback } from "@/entities/feedback";
import { cn } from "@/shared/lib/cn";
import { useFormatDuration } from "@/shared/lib/format";
import { LinkButton } from "@/shared/ui";
import { ScoreRing } from "./score-ring";

interface ReportViewProps {
  feedback: SessionFeedback;
  jobTitle: string;
  duration: number;
  sessionId: string;
}

function QuestionItem({
  qa,
  sessionId,
}: {
  qa: QuestionAnalysis;
  sessionId: string;
}) {
  const t = useTranslations("report");
  const [expanded, setExpanded] = useState(false);

  const answerPreview = qa.answer
    ? qa.answer.length > 100
      ? `${qa.answer.slice(0, 100).trimEnd()}...`
      : qa.answer
    : "";

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <span className="text-sm text-muted shrink-0 w-8">
          Q{qa.questionId}
        </span>
        <span className="font-medium text-base flex-1">{qa.questionText}</span>
      </div>
      <div className="flex items-center gap-2 ml-11">
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
        <span className="ml-auto text-sm text-muted">
          {t("scoreSuffix", { n: qa.contentScore })}
        </span>
      </div>
      {answerPreview && (
        <p className="text-sm text-foreground/50 ml-11 leading-relaxed">
          "{answerPreview}"
        </p>
      )}
      <p className="text-[15px] text-foreground/70 leading-relaxed ml-11">
        {qa.feedback}
      </p>
      <div className="flex items-center gap-2 ml-11">
        <Link
          href={`/drill/${sessionId}?q=${qa.questionId}`}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo via-purple to-pink text-white hover:opacity-90 transition-opacity"
        >
          {t("drillRetry")}
        </Link>
        {qa.suggestedAnswer && (
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-muted hover:text-secondary transition-colors"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
          >
            <span>{t("sampleAnswer")}</span>
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
        )}
      </div>
      {expanded && qa.suggestedAnswer && (
        <div className="ml-11 border-l-[3px] border-l-indigo/50 bg-white/[0.02] rounded-r-lg px-4 py-3">
          <p className="text-sm text-foreground/70 leading-relaxed">
            {qa.suggestedAnswer}
          </p>
        </div>
      )}
    </div>
  );
}

export function ReportView({
  feedback,
  jobTitle,
  duration,
  sessionId,
}: ReportViewProps) {
  const t = useTranslations("report");
  const formatDuration = useFormatDuration();

  return (
    <div className="max-w-4xl mx-auto px-6 py-20 lg:py-28 space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted text-lg">
          {jobTitle} · {formatDuration(duration)}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="rounded-xl bg-card border border-border-subtle flex items-center justify-center gap-16 py-10">
          <ScoreRing
            score={feedback.deliveryScore}
            label={t("deliveryScore")}
          />
          <ScoreRing score={feedback.contentScore} label={t("contentScore")} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="rounded-xl bg-card border border-border-subtle p-6">
          <h2 className="text-lg font-semibold mb-2">{t("summary")}</h2>
          <p className="text-foreground/80 text-base leading-relaxed">
            {feedback.summary}
          </p>
        </div>
      </motion.div>

      {feedback.keyMoments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="rounded-xl bg-card border border-border-subtle p-6">
            <h2 className="text-lg font-semibold mb-4">{t("keyMoments")}</h2>
            <div className="space-y-2">
              {feedback.keyMoments.map((moment, i) => (
                <div
                  key={`${i}-${moment.timestamp}-${moment.type}`}
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="rounded-xl bg-card border border-border-subtle p-6">
          <h2 className="text-lg font-semibold mb-4">{t("actionItems")}</h2>
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

      {feedback.questionAnalyses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <div className="rounded-xl bg-card border border-border-subtle p-6">
            <h2 className="text-lg font-semibold mb-6">
              {t("questionAnalyses")}
            </h2>
            <div className="space-y-8">
              {feedback.questionAnalyses.map((qa, i) => (
                <QuestionItem
                  key={`${i}-${qa.questionId}`}
                  qa={qa}
                  sessionId={sessionId}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
      >
        <div className="gradient-border rounded-xl">
          <div className="rounded-xl bg-background p-8">
            <h2 className="text-xl font-bold mb-2">{t("nextSession")}</h2>
            <p className="text-foreground text-base leading-relaxed">
              {feedback.nextSessionSuggestion}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
        className="flex justify-center"
      >
        <LinkButton href="/dashboard" variant="secondary" size="lg">
          {t("backToDashboard")}
        </LinkButton>
      </motion.div>
    </div>
  );
}
