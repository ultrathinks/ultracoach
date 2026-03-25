"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDrillEngine } from "@/features/drill";
import { DrillPrepScreen } from "@/features/drill/drill-prep-screen";
import { cn } from "@/shared/lib/cn";
import { ScoreRing } from "@/widgets/report/score-ring";

interface DrillScreenProps {
  sessionId: string;
  questionId: number;
  question: string;
  suggestedAnswer: string | null;
  jobTitle: string;
  nextQuestionId: number | null;
}

const starLabels = [
  { key: "situation" as const, label: "Situation" },
  { key: "task" as const, label: "Task" },
  { key: "action" as const, label: "Action" },
  { key: "result" as const, label: "Result" },
];

export function DrillScreen({
  sessionId,
  questionId,
  question,
  suggestedAnswer,
  jobTitle,
  nextQuestionId,
}: DrillScreenProps) {
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

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Prep → listening 전환 시 video element에 stream 연결
  useEffect(() => {
    if ((drillPhase === "speaking" || drillPhase === "listening") && webcamRef.current && streamRef.current) {
      webcamRef.current.srcObject = streamRef.current;
    }
  }, [drillPhase, streamRef]);

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

  // Prep phase
  if (drillPhase === "prep") {
    return (
      <DrillPrepScreen
        question={question}
        suggestedAnswer={suggestedAnswer}
        onStart={handlePrepStart}
      />
    );
  }

  // Processing phase
  if (drillPhase === "processing") {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin mb-4" />
        <p className="text-secondary">분석 중</p>
      </div>
    );
  }

  // Done + goal achieved
  if (drillPhase === "done" && goalAchieved) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-6"
        >
          <div className="text-5xl font-bold gradient-text">&#x2605;</div>
          <h1 className="text-2xl font-bold gradient-text">목표 달성!</h1>
          <ScoreRing score={bestScore} label="최종 점수" size={140} />
          <div className="flex flex-col gap-3">
            {nextQuestionId !== null && (
              <button
                type="button"
                onClick={handleNextQuestion}
                className="px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 transition-opacity cursor-pointer"
              >
                다음 아쉬운 답변으로
              </button>
            )}
            <button
              type="button"
              onClick={handleGoToResults}
              className="px-6 py-3 rounded-xl text-sm font-medium border border-white/[0.06] hover:bg-card-hover transition-colors cursor-pointer"
            >
              결과 화면으로
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Done + goal not achieved
  if (drillPhase === "done" && !goalAchieved) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-6 text-center">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">연습을 마쳤습니다</h1>
          <p className="text-secondary">5회 시도 중 최고 점수</p>
          <ScoreRing score={bestScore} label="최고 점수" size={140} />
          <p className="text-sm text-muted max-w-sm">
            꾸준한 연습이 실력을 만듭니다. 다음에 다시 도전해 보세요
          </p>
          <button
            type="button"
            onClick={handleGoToResults}
            className="px-6 py-3 rounded-xl text-sm font-medium border border-white/[0.06] hover:bg-card-hover transition-colors cursor-pointer"
          >
            결과 화면으로
          </button>
        </div>
      </div>
    );
  }

  // Feedback phase
  if (drillPhase === "feedback") {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg space-y-6 text-center">
          {validationError ? (
            <>
              <p className="text-sm text-yellow-400">{validationError}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 transition-opacity cursor-pointer"
              >
                다시 시도
              </button>
            </>
          ) : result ? (
            <>
              <ScoreRing score={result.contentScore} label="내용 점수" />
              <p className="text-sm text-secondary leading-relaxed text-left">
                {result.feedback}
              </p>

              {/* STAR indicators */}
              <div className="flex justify-center gap-4">
                {starLabels.map(({ key, label }) => (
                  <div key={key} className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                        result.starFulfillment[key]
                          ? "bg-green-500/15 text-green-400"
                          : "bg-white/[0.06] text-muted",
                      )}
                    >
                      {label[0]}
                    </div>
                    <span className="text-xs text-muted">{label}</span>
                  </div>
                ))}
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 transition-opacity cursor-pointer"
                >
                  다시 시도
                </button>
                {nextQuestionId !== null && (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="px-6 py-3 rounded-xl text-sm font-medium border border-white/[0.06] hover:bg-card-hover transition-colors cursor-pointer"
                  >
                    다음 질문으로
                  </button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  // Listening phase (default)
  return (
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted">{jobTitle}</span>
        <span className="text-sm text-secondary font-medium">
          시도 {attemptCount + 1}/5
        </span>
      </div>

      {/* Camera */}
      <div className="relative w-full max-w-2xl mx-auto aspect-video rounded-xl overflow-hidden bg-card border border-white/[0.06]">
        <video
          ref={webcamRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </div>

      {/* Audio level bar / speaking indicator */}
      {drillPhase === "speaking" ? (
        <p className="text-sm text-center text-secondary mt-4 h-6 animate-pulse">
          질문을 읽는 중...
        </p>
      ) : (
        <div className="flex items-center justify-center gap-1 mt-4 h-6">
          {[0.15, 0.35, 0.55, 0.75, 0.9].map((t, i) => (
            <div
              key={t}
              className={cn(
                "w-1 rounded-full transition-colors duration-75",
                normalizedLevel > t ? "bg-green" : "bg-white/[0.06]",
              )}
              style={{ height: `${8 + i * 3}px` }}
            />
          ))}
        </div>
      )}

      {/* Question */}
      <p className="text-center text-foreground mt-4 max-w-2xl mx-auto leading-relaxed">
        {question}
      </p>

      {/* Collapsible suggested answer */}
      {suggestedAnswer && (
        <button
          type="button"
          className="mt-4 max-w-2xl mx-auto w-full rounded-xl bg-card border border-white/[0.06] p-4 cursor-pointer select-none text-left"
          onClick={() => setAnswerExpanded((prev) => !prev)}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-secondary">
              모범 답안 참고
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
            <p className="mt-3 text-sm text-secondary leading-relaxed">
              {suggestedAnswer}
            </p>
          )}
        </button>
      )}

      {/* Stop button */}
      <div className="flex justify-center mt-6">
        <button
          type="button"
          onClick={stopDrill}
          className="h-10 px-5 rounded-full text-red-400 text-sm font-medium hover:bg-red-400/10 transition-colors cursor-pointer"
        >
          연습 중단
        </button>
      </div>
    </div>
  );
}
