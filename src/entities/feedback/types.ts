import type { z } from "zod";
import type {
  questionAnalysisSchema,
  sessionFeedbackSchema,
  starFulfillmentSchema,
} from "./schema";

export interface KeyMoment {
  timestamp: number;
  duration: number;
  description: string;
  type: "positive" | "negative";
}

export interface ActionItem {
  id: number;
  text: string;
}

export type StarFulfillment = z.infer<typeof starFulfillmentSchema>;
export type QuestionAnalysis = z.infer<typeof questionAnalysisSchema>;
export type SessionFeedback = z.infer<typeof sessionFeedbackSchema>;
