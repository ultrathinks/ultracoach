import { create } from "zustand";
import type {
  EnginePhase,
  HistoryEntry,
  InterviewMode,
  InterviewType,
  QuestionEntry,
} from "./types";

interface SessionState {
  jobTitle: string;
  interviewType: InterviewType;
  mode: InterviewMode;
  resumeFileId: string | null;

  phase: EnginePhase;
  history: HistoryEntry[];
  questions: QuestionEntry[];
  currentQuestion: string | null;
  startTime: number | null;
  sessionDbId: string | null;

  setSetup: (setup: {
    jobTitle: string;
    interviewType: InterviewType;
    mode: InterviewMode;
    resumeFileId?: string | null;
  }) => void;
  setPhase: (phase: EnginePhase) => void;
  addHistory: (entry: HistoryEntry) => void;
  addQuestion: (q: QuestionEntry) => void;
  updateLastAnswer: (answer: string) => void;
  setCurrentQuestion: (q: string | null) => void;
  setStartTime: (t: number) => void;
  setSessionDbId: (id: string) => void;
  reset: () => void;
}

const initialState = {
  jobTitle: "",
  interviewType: "personality" as InterviewType,
  mode: "real" as InterviewMode,
  resumeFileId: null,
  phase: "idle" as EnginePhase,
  history: [],
  questions: [],
  currentQuestion: null,
  startTime: null,
  sessionDbId: null,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,
  setSetup: (setup) => set(setup),
  setPhase: (phase) => set({ phase }),
  addHistory: (entry) =>
    set((s) => ({ history: [...s.history, entry] })),
  addQuestion: (q) =>
    set((s) => ({ questions: [...s.questions, q] })),
  updateLastAnswer: (answer) =>
    set((s) => {
      const questions = [...s.questions];
      const last = questions[questions.length - 1];
      if (last) {
        questions[questions.length - 1] = {
          ...last,
          answer,
          endTime: Date.now(),
        };
      }
      return { questions };
    }),
  setCurrentQuestion: (q) => set({ currentQuestion: q }),
  setStartTime: (t) => set({ startTime: t }),
  setSessionDbId: (id) => set({ sessionDbId: id }),
  reset: () => set(initialState),
}));
