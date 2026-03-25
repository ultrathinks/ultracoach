import { NextResponse } from "next/server";

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

export function rateLimit(opts: { windowMs: number; max: number }) {
  return (userId: string, routeKey: string): NextResponse | null => {
    cleanup(opts.windowMs);

    const key = `${routeKey}:${userId}`;
    const now = Date.now();
    const cutoff = now - opts.windowMs;

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

    if (entry.timestamps.length >= opts.max) {
      return NextResponse.json({ error: "too many requests" }, { status: 429 });
    }

    entry.timestamps.push(now);
    return null;
  };
}
