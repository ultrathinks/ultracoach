"use client";

import type { FillerHeatmapData } from "@/entities/analytics";
import { cn } from "@/shared/lib/cn";

interface FillerHeatmapProps {
  data: FillerHeatmapData;
}

function FillerHeatmapInner({ data }: FillerHeatmapProps) {
  if (data.sessions.length === 0 || data.words.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-white/[0.1] p-6">
        <h3 className="text-base font-semibold mb-4">추임새 빈도</h3>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-secondary text-sm">
            세션이 쌓이면 추임새 패턴을 한눈에 볼 수 있어요
          </p>
        </div>
      </div>
    );
  }

  // aggregate: average freq per word across all sessions
  const wordStats = data.words.map((word, wi) => {
    const freqs = data.sessions.map((_, si) => {
      const key = `${si}-${wi}`;
      return data.cells.find(
        (c) => c.sessionIdx === si && c.wordIdx === wi,
      )?.freqPerMin ?? 0;
    });
    const total = freqs.reduce((a, b) => a + b, 0);
    const avg = total / data.sessions.length;
    const recent = freqs.slice(0, 3);
    const recentAvg = recent.length > 0
      ? recent.reduce((a, b) => a + b, 0) / recent.length
      : 0;
    const older = freqs.slice(3, 6);
    const olderAvg = older.length > 0
      ? older.reduce((a, b) => a + b, 0) / older.length
      : 0;
    const trend =
      older.length === 0 ? "none" : recentAvg < olderAvg ? "down" : recentAvg > olderAvg ? "up" : "flat";
    return { word, avg, total, trend, recentFreqs: freqs.slice(0, 5).reverse() };
  });

  wordStats.sort((a, b) => b.avg - a.avg);
  const maxAvg = wordStats[0]?.avg ?? 1;

  return (
    <div className="rounded-xl bg-card border border-white/[0.1] p-6">
      <h3 className="text-base font-semibold mb-5">추임새 빈도</h3>
      <div className="space-y-3">
        {wordStats.map(({ word, avg, trend, recentFreqs }) => (
          <div key={word} className="flex items-center gap-4">
            <span className="text-sm font-medium w-12 shrink-0 text-right">
              {word}
            </span>
            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 h-7 bg-white/[0.03] rounded-lg overflow-hidden relative">
                <div
                  className={cn(
                    "h-full rounded-lg transition-all",
                    avg >= maxAvg * 0.66
                      ? "bg-pink/50"
                      : avg >= maxAvg * 0.33
                        ? "bg-purple/40"
                        : "bg-indigo/30",
                  )}
                  style={{
                    width: `${Math.max((avg / maxAvg) * 100, 4)}%`,
                  }}
                />
                <span className="absolute inset-0 flex items-center px-3 text-xs text-foreground/70">
                  {avg.toFixed(1)}/분
                </span>
              </div>
              {/* mini sparkline */}
              {recentFreqs.length > 1 && (
                <svg
                  width={40}
                  height={20}
                  viewBox="0 0 40 20"
                  className="shrink-0"
                >
                  {(() => {
                    const max = Math.max(...recentFreqs, 0.1);
                    const points = recentFreqs
                      .map(
                        (f, i) =>
                          `${(i / (recentFreqs.length - 1)) * 40},${20 - (f / max) * 16 - 2}`,
                      )
                      .join(" ");
                    return (
                      <polyline
                        points={points}
                        fill="none"
                        stroke={
                          trend === "down"
                            ? "var(--color-green)"
                            : trend === "up"
                              ? "var(--color-red)"
                              : "var(--color-muted)"
                        }
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })()}
                </svg>
              )}
              {trend !== "none" && (
                <span
                  className={cn(
                    "text-xs shrink-0",
                    trend === "down" && "text-green",
                    trend === "up" && "text-red",
                    trend === "flat" && "text-muted",
                  )}
                >
                  {trend === "down" ? "↓" : trend === "up" ? "↑" : "—"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { FillerHeatmapInner };
