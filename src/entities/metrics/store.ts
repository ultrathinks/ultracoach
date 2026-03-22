import { create } from "zustand";
import type { MetricEvent, MetricSnapshot } from "./types";

const MAX_SNAPSHOTS = 600;

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
    set((s) => {
      const next = [...s.snapshots, snapshot];
      return {
        snapshots: next.length > MAX_SNAPSHOTS ? next.slice(-MAX_SNAPSHOTS) : next,
        latest: snapshot,
      };
    }),
  addEvent: (event) =>
    set((s) => ({
      events: [...s.events, event],
    })),
  reset: () => set({ snapshots: [], events: [], latest: null }),
}));
