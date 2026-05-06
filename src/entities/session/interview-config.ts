import type { InterviewType } from "./types";

export interface InterviewConfig {
  // VAD
  vadThreshold: number;
  silenceDelay: number;
  minSpeechDuration: number;
  gracePeriod: number;

  // interview flow
  targetQuestionCount: number;
  maxQuestionCount: number;
}

const typeConfig: Record<
  InterviewType,
  Pick<
    InterviewConfig,
    "silenceDelay" | "targetQuestionCount" | "maxQuestionCount"
  >
> = {
  personality: {
    silenceDelay: 3000,
    targetQuestionCount: 12,
    maxQuestionCount: 18,
  },
  technical: {
    silenceDelay: 4500,
    targetQuestionCount: 8,
    maxQuestionCount: 12,
  },
  "culture-fit": {
    silenceDelay: 3500,
    targetQuestionCount: 10,
    maxQuestionCount: 15,
  },
};

export function deriveConfig(type: InterviewType): InterviewConfig {
  const tc = typeConfig[type];

  return {
    vadThreshold: 0.035,
    silenceDelay: tc.silenceDelay,
    minSpeechDuration: 1000,
    gracePeriod: 800,

    targetQuestionCount: tc.targetQuestionCount,
    maxQuestionCount: tc.maxQuestionCount,
  };
}
