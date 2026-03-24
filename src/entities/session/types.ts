export type InterviewMode = "practice" | "real";
export type InterviewType = "personality" | "technical" | "culture-fit";
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
