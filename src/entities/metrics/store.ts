import { create } from "zustand";
import type { MetricEvent, MetricSnapshot } from "./types";

interface MetricsState {
  snapshots: MetricSnapshot[];
  events: MetricEvent[];
  latest: MetricSnapshot | null;
  push: (snapshot: MetricSnapshot) => void;
  addEvent: (event: MetricEvent) => void;
  reset: () => void;
}

export const useMetricsStore = create<MetricsState>((set) => ({
  snapshots: [],
  events: [],
  latest: null,
  push: (snapshot) =>
    set((s) => ({
      snapshots: [...s.snapshots, snapshot],
      latest: snapshot,
    })),
  addEvent: (event) =>
    set((s) => ({
      events: [...s.events, event],
    })),
  reset: () => set({ snapshots: [], events: [], latest: null }),
}));
