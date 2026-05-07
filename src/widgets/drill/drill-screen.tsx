"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDrillEngine } from "@/features/drill";
import { DrillPrepScreen } from "@/features/drill/drill-prep-screen";
import { useWebSpeech } from "@/features/interview-engine/use-web-speech";
import { cn } from "@/shared/lib/cn";
import { Button, FormError, LinkButton, Spinner } from "@/shared/ui";
import { ScoreRing } from "@/widgets/report/score-ring";

interface DrillScreenProps {
  sessionId: string;
  questionId: number;
  question: string;
  suggestedAnswer: string | null;
  jobTitle: string;
  nextQuestionId: number | null;
}

const STAR_KEYS = ["situation", "task", "action", "result"] as const;

export function DrillScreen({
  sessionId,
  questionId,
  question,
  suggestedAnswer,
  jobTitle,
  nextQuestionId,
}: DrillScreenProps) {
  const t = useTranslations("drill");
  const router = useRouter();
  const {
    drillPhase,
    transcript: _transcript,
    result,
    audioLevel,
    attemptCount,
    bestScore,
    goalAchieved,
    validationError,
    startDrill,
    stopDrill,
    cleanup,
    streamRef,
  } = useDrillEngine({ sessionId, questionId, question });

  const webcamRef = useRef<HTMLVideoElement>(null);
  const [answerExpanded, setAnswerExpanded] = useState(false);
  const { liveCaption, start: startSpeech, stop: stopSpeech } = useWebSpeech();

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    if (
      (drillPhase === "speaking" || drillPhase === "listening") &&
      webcamRef.current &&
      streamRef.current
    ) {
      webcamRef.current.srcObject = streamRef.current;
    }
  }, [drillPhase, streamRef]);

  useEffect(() => {
    if (drillPhase === "listening") {
      startSpeech();
    } else {
      stopSpeech();
    }
  }, [drillPhase, startSpeech, stopSpeech]);

  const handlePrepStart = useCallback(
    (stream: MediaStream) => {
      streamRef.current = stream;
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
      }
      startDrill();
    },
    [streamRef, startDrill],
  );

  const handleRetry = useCallback(() => {
    startDrill();
  }, [startDrill]);

  const handleNextQuestion = useCallback(() => {
    cleanup();
    if (nextQuestionId !== null) {
      router.replace(`/drill/${sessionId}?q=${nextQuestionId}`);
    }
  }, [cleanup, nextQuestionId, router, sessionId]);

  const handleGoToResults = useCallback(() => {
    cleanup();
    router.push(`/results/${sessionId}`);
  }, [cleanup, router, sessionId]);

  const normalizedLevel = Math.min(audioLevel / 0.1, 1);

  if (drillPhase === "prep") {
    return (
      <DrillPrepScreen
        question={question}
        suggestedAnswer={suggestedAnswer}
        onStart={handlePrepStart}
      />
    );
  }

  if (drillPhase === "processing") {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center">
        <Spinner size="lg" className="mb-4" />
        <p className="text-secondary">{t("analyzing")}</p>
      </div>
    );
  }

  if (drillPhase === "done" && goalAchieved) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-6"
        >
          <div className="text-5xl font-bold gradient-text">&#x2605;</div>
          <h1 className="text-2xl font-bold gradient-text">
            {t("goalAchieved")}
          </h1>
          <ScoreRing score={bestScore} label={t("finalScore")} size={140} />
          <div className="flex flex-col gap-2">
            {nextQuestionId !== null && (
              <Button size="lg" onClick={handleNextQuestion}>
                {t("nextWeak")}
              </Button>
            )}
            <Button variant="secondary" size="lg" onClick={handleGoToResults}>
              {t("toResults")}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (drillPhase === "done" && !goalAchieved) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-6 text-center">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">{t("drillEnded")}</h1>
          <p className="text-secondary">{t("drillEndedDesc")}</p>
          <ScoreRing score={bestScore} label={t("bestScore")} size={140} />
          <p className="text-sm text-muted max-w-sm">{t("encourage")}</p>
          <Button variant="secondary" size="lg" onClick={handleGoToResults}>
            {t("toResults")}
          </Button>
        </div>
      </div>
    );
  }

  if (drillPhase === "feedback") {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg space-y-6 text-center">
          {validationError ? (
            <>
              <FormError tone="warning">{validationError}</FormError>
              <Button size="lg" onClick={handleRetry}>
                {t("retry")}
              </Button>
            </>
          ) : result ? (
            <>
              <ScoreRing score={result.contentScore} label={t("score")} />
              <p className="text-sm text-secondary leading-relaxed text-left">
                {result.feedback}
              </p>

              <div className="flex justify-center gap-4">
                {STAR_KEYS.map((key) => (
                  <div key={key} className="flex flex-col items-center gap-2">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                        result.starFulfillment[key]
                          ? "bg-green/15 text-green"
                          : "bg-white/[0.06] text-muted",
                      )}
                    >
                      {key[0].toUpperCase()}
                    </div>
                    <span className="text-xs text-muted">
                      {t(
                        `starLabels.${key}` as
                          | "starLabels.situation"
                          | "starLabels.task"
                          | "starLabels.action"
                          | "starLabels.result",
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <Button size="lg" onClick={handleRetry}>
                  {t("retry")}
                </Button>
                {nextQuestionId !== null && (
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleNextQuestion}
                  >
                    {t("nextQuestion")}
                  </Button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted">{jobTitle}</span>
        <span className="text-sm text-secondary font-medium">
          {t("attempt", { n: attemptCount + 1 })}
        </span>
      </div>

      <div className="relative w-full max-w-2xl mx-auto aspect-video rounded-xl overflow-hidden bg-card border border-border-subtle">
        <video
          ref={webcamRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </div>

      {drillPhase === "speaking" ? (
        <p className="text-sm text-center text-secondary mt-4 h-6 animate-pulse">
          {t("speakingHint")}
        </p>
      ) : (
        <div className="flex items-center justify-center gap-1 mt-4 h-6">
          {[0.15, 0.35, 0.55, 0.75, 0.9].map((threshold, i) => (
            <div
              key={threshold}
              className={cn(
                "w-1 rounded-full transition-colors duration-75",
                normalizedLevel > threshold ? "bg-green" : "bg-white/[0.06]",
              )}
              style={{ height: `${8 + i * 3}px` }}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {liveCaption && drillPhase === "listening" ? (
          <motion.p
            key="caption"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-secondary mt-4 max-w-2xl mx-auto leading-relaxed"
          >
            {liveCaption}
          </motion.p>
        ) : (
          <motion.p
            key="question"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-foreground mt-4 max-w-2xl mx-auto leading-relaxed"
          >
            {question}
          </motion.p>
        )}
      </AnimatePresence>

      {suggestedAnswer && (
        <button
          type="button"
          className="mt-4 max-w-2xl mx-auto w-full rounded-xl bg-card border border-border-subtle p-4 cursor-pointer select-none text-left"
          onClick={() => setAnswerExpanded((prev) => !prev)}
          aria-expanded={answerExpanded}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-secondary">
              {t("suggestedAnswer")}
            </span>
            <svg
              width={16}
              height={16}
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="text-muted transition-transform duration-200"
              style={{
                transform: answerExpanded ? "rotate(180deg)" : "rotate(0deg)",
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
          </div>
          {answerExpanded && (
            <p className="mt-2 text-sm text-secondary leading-relaxed">
              {suggestedAnswer}
            </p>
          )}
        </button>
      )}

      <div className="flex justify-center mt-6">
        <button
          type="button"
          onClick={stopDrill}
          className="h-10 px-5 rounded-full text-red text-sm font-medium hover:bg-red/10 transition-colors cursor-pointer"
        >
          {t("stopDrill")}
        </button>
      </div>
    </div>
  );
}
