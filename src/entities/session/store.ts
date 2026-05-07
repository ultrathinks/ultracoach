import { z } from "zod";
import { create } from "zustand";
import {
  AVATARS,
  type AvatarId,
  DEFAULT_AVATAR_ID,
} from "@/shared/config/avatars";
import type {
  EngineError,
  EnginePhase,
  HistoryEntry,
  InterviewType,
  JobResearch,
  QuestionEntry,
} from "./types";

const DEVICES_STORAGE_KEY = "ultracoach:devices";
const AVATAR_STORAGE_KEY = "ultracoach:preferred-avatar";

interface DevicePreferences {
  audioInputId: string | null;
  audioOutputId: string | null;
  videoInputId: string | null;
}

const devicePreferencesSchema = z.object({
  audioInputId: z.string().nullable().optional(),
  audioOutputId: z.string().nullable().optional(),
  videoInputId: z.string().nullable().optional(),
});

function loadDevicePreferences(): DevicePreferences {
  if (typeof window === "undefined") {
    return { audioInputId: null, audioOutputId: null, videoInputId: null };
  }
  try {
    const raw = window.localStorage.getItem(DEVICES_STORAGE_KEY);
    if (!raw) {
      return { audioInputId: null, audioOutputId: null, videoInputId: null };
    }
    const parsed = devicePreferencesSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return { audioInputId: null, audioOutputId: null, videoInputId: null };
    }
    return {
      audioInputId: parsed.data.audioInputId ?? null,
      audioOutputId: parsed.data.audioOutputId ?? null,
      videoInputId: parsed.data.videoInputId ?? null,
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

function loadPreferredAvatar(): AvatarId {
  if (typeof window === "undefined") return DEFAULT_AVATAR_ID;
  try {
    const raw = window.localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) return DEFAULT_AVATAR_ID;
    const valid = AVATARS.find((a) => a.id === raw);
    return valid ? valid.id : DEFAULT_AVATAR_ID;
  } catch {
    return DEFAULT_AVATAR_ID;
  }
}

function savePreferredAvatar(id: AvatarId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AVATAR_STORAGE_KEY, id);
  } catch {
    // ignore quota or privacy mode failures
  }
}

interface SessionData {
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
  avatarId: AvatarId;
  calibratedVadThreshold: number | null;
}

interface SessionActions {
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
  setAvatar: (id: AvatarId) => void;
  setCalibratedVadThreshold: (threshold: number | null) => void;
  reset: () => void;
}

type SessionState = SessionData & SessionActions;

function buildInitialState(): SessionData {
  const devices = loadDevicePreferences();
  return {
    jobTitle: "",
    interviewType: "personality",
    resumeFileId: null,
    companyName: null,
    jobResearch: null,
    phase: "idle",
    error: null,
    history: [],
    questions: [],
    currentQuestion: null,
    startTime: null,
    sessionDbId: null,
    audioInputId: devices.audioInputId,
    audioOutputId: devices.audioOutputId,
    videoInputId: devices.videoInputId,
    userPaused: false,
    avatarId: loadPreferredAvatar(),
    calibratedVadThreshold: null,
  };
}

const initialState = buildInitialState();

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
  setAvatar: (id) => {
    savePreferredAvatar(id);
    set({ avatarId: id });
  },
  setCalibratedVadThreshold: (threshold) =>
    set({ calibratedVadThreshold: threshold }),
  reset: () =>
    set((s) => ({
      ...initialState,
      audioInputId: s.audioInputId,
      audioOutputId: s.audioOutputId,
      videoInputId: s.videoInputId,
      avatarId: s.avatarId,
      calibratedVadThreshold: s.calibratedVadThreshold,
      userPaused: false,
    })),
}));
