import { z } from "zod";

export const interviewTypeSchema = z.enum([
  "personality",
  "technical",
  "culture-fit",
]);
export const interviewModeSchema = z.enum(["practice", "real"]);

export type InterviewType = z.infer<typeof interviewTypeSchema>;
export type InterviewMode = z.infer<typeof interviewModeSchema>;
export type EnginePhase =
  | "idle"
  | "generating"
  | "speaking"
  | "listening"
  | "processing"
  | "paused"
  | "error"
  | "ended"
  | "analyzing";

export interface EngineError {
  type: "permission" | "network" | "api" | "timeout";
  message: string;
}

export interface HistoryEntry {
  role: "interviewer" | "interviewee";
  content: string;
}

export interface QuestionEntry {
  id: number;
  type: string;
  text: string;
  answer: string | null;
  startTime: number;
  endTime: number | null;
}

export interface JobResearch {
  jobRequirements: string[];
  companyInfo?: string;
  recentNews?: string[];
  interviewTrends: string[];
}
