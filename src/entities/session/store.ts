import { create } from "zustand";
import type {
  EngineError,
  EnginePhase,
  HistoryEntry,
  InterviewType,
  JobResearch,
  QuestionEntry,
} from "./types";

const DEVICES_STORAGE_KEY = "ultracoach:devices";

interface DevicePreferences {
  audioInputId: string | null;
  audioOutputId: string | null;
  videoInputId: string | null;
}

function loadDevicePreferences(): DevicePreferences {
  if (typeof window === "undefined") {
    return { audioInputId: null, audioOutputId: null, videoInputId: null };
  }
  try {
    const raw = window.localStorage.getItem(DEVICES_STORAGE_KEY);
    if (!raw) {
      return { audioInputId: null, audioOutputId: null, videoInputId: null };
    }
    const parsed = JSON.parse(raw) as Partial<DevicePreferences>;
    return {
      audioInputId: parsed.audioInputId ?? null,
      audioOutputId: parsed.audioOutputId ?? null,
      videoInputId: parsed.videoInputId ?? null,
    };
  } catch {
    return { audioInputId: null, audioOutputId: null, videoInputId: null };
  }
}

function saveDevicePreferences(prefs: DevicePreferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota or privacy mode failures
  }
}

interface SessionState {
  jobTitle: string;
  interviewType: InterviewType;
  resumeFileId: string | null;
  companyName: string | null;
  jobResearch: JobResearch | null;

  phase: EnginePhase;
  error: EngineError | null;
  history: HistoryEntry[];
  questions: QuestionEntry[];
  currentQuestion: string | null;
  startTime: number | null;
  sessionDbId: string | null;

  audioInputId: string | null;
  audioOutputId: string | null;
  videoInputId: string | null;
  userPaused: boolean;

  setSetup: (setup: {
    jobTitle: string;
    interviewType: InterviewType;
    resumeFileId?: string | null;
    companyName?: string | null;
  }) => void;
  setJobResearch: (research: JobResearch | null) => void;
  setPhase: (phase: EnginePhase) => void;
  setError: (error: EngineError) => void;
  clearError: () => void;
  addHistory: (entry: HistoryEntry) => void;
  addQuestion: (q: QuestionEntry) => void;
  updateLastAnswer: (answer: string) => void;
  setCurrentQuestion: (q: string | null) => void;
  setStartTime: (t: number) => void;
  setSessionDbId: (id: string) => void;
  setDevices: (d: Partial<DevicePreferences>) => void;
  setUserPaused: (paused: boolean) => void;
  reset: () => void;
}

const initialState = {
  jobTitle: "",
  interviewType: "personality" as InterviewType,
  resumeFileId: null,
  companyName: null as string | null,
  jobResearch: null as JobResearch | null,
  phase: "idle" as EnginePhase,
  error: null as EngineError | null,
  history: [] as HistoryEntry[],
  questions: [] as QuestionEntry[],
  currentQuestion: null as string | null,
  startTime: null as number | null,
  sessionDbId: null as string | null,
  ...loadDevicePreferences(),
  userPaused: false,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,
  setSetup: (setup) => set(setup),
  setJobResearch: (research) => set({ jobResearch: research }),
  setPhase: (phase) => set({ phase }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  addHistory: (entry) => set((s) => ({ history: [...s.history, entry] })),
  addQuestion: (q) => set((s) => ({ questions: [...s.questions, q] })),
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
  setDevices: (d) =>
    set((s) => {
      const next: DevicePreferences = {
        audioInputId: d.audioInputId ?? s.audioInputId,
        audioOutputId: d.audioOutputId ?? s.audioOutputId,
        videoInputId: d.videoInputId ?? s.videoInputId,
      };
      saveDevicePreferences(next);
      return next;
    }),
  setUserPaused: (paused) => set({ userPaused: paused }),
  reset: () =>
    set((s) => ({
      ...initialState,
      audioInputId: s.audioInputId,
      audioOutputId: s.audioOutputId,
      videoInputId: s.videoInputId,
      userPaused: false,
    })),
}));
