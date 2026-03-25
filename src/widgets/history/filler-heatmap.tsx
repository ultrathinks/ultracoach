"use client";

import type { FillerHeatmapData } from "@/entities/analytics";
import { useState } from "react";

interface FillerHeatmapProps {
  data: FillerHeatmapData;
}

const CELL_SIZE = 28;
const CELL_GAP = 3;
const CELL_RADIUS = 4;
const LABEL_WIDTH = 48;
const HEADER_HEIGHT = 8;

function cellColor(freqPerMin: number, maxFreq: number): string {
  if (maxFreq === 0) return "rgba(129,140,248,0.05)";
  const t = Math.min(freqPerMin / maxFreq, 1);
  const r = Math.round(129 + t * (244 - 129));
  const g = Math.round(140 + t * (114 - 140));
  const b = Math.round(248 + t * (182 - 248));
  return `rgba(${r},${g},${b},${0.15 + t * 0.75})`;
}

interface TooltipState {
  x: number;
  y: number;
  word: string;
  freq: number;
  sessionLabel: string;
}

function FillerHeatmapInner({ data }: FillerHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

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

  const gridWidth = data.words.length * (CELL_SIZE + CELL_GAP) - CELL_GAP;
  const gridHeight = data.sessions.length * (CELL_SIZE + CELL_GAP) - CELL_GAP;
  const svgWidth = LABEL_WIDTH + gridWidth;
  const svgHeight = HEADER_HEIGHT + gridHeight;

  // Build a lookup for cells: key = "sessionIdx-wordIdx"
  const cellMap = new Map<string, number>();
  for (const cell of data.cells) {
    cellMap.set(`${cell.sessionIdx}-${cell.wordIdx}`, cell.freqPerMin);
  }

  return (
    <div data-heatmap className="rounded-xl bg-card border border-white/[0.1] p-6 relative">
      <h3 className="text-base font-semibold mb-4">추임새 빈도</h3>
      <div className="overflow-x-auto">
        <svg
          width={svgWidth}
          height={svgHeight}
          className="block"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Rows (sessions) — word labels shown via tooltip on hover */}
          {data.sessions.map((session, si) => (
            <g key={`row-${session.sessionId}`}>
              {/* Row label (date) */}
              <text
                x={LABEL_WIDTH - 8}
                y={HEADER_HEIGHT + si * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2 + 4}
                textAnchor="end"
                fill="var(--color-secondary)"
                fontSize={12}
              >
                {session.label}
              </text>

              {/* Cells */}
              {data.words.map((word, wi) => {
                const freq = cellMap.get(`${si}-${wi}`) ?? 0;
                const cx = LABEL_WIDTH + wi * (CELL_SIZE + CELL_GAP);
                const cy = HEADER_HEIGHT + si * (CELL_SIZE + CELL_GAP);
                return (
                  <rect
                    key={`cell-${session.sessionId}-${word}`}
                    x={cx}
                    y={cy}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    rx={CELL_RADIUS}
                    ry={CELL_RADIUS}
                    fill={freq === 0 ? "rgba(129,140,248,0.05)" : cellColor(freq, data.maxFreq)}
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      const card = e.currentTarget.closest("[data-heatmap]");
                      if (!card) return;
                      const cardRect = card.getBoundingClientRect();
                      const cellRect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        x: cellRect.left - cardRect.left + cellRect.width / 2,
                        y: cellRect.top - cardRect.top - 4,
                        word,
                        freq,
                        sessionLabel: session.label,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </g>
          ))}
        </svg>
      </div>

      {/* Tooltip outside scroll container — never clipped */}
      {tooltip && (
        <div
          className="absolute pointer-events-none rounded-md border border-white/10 bg-card px-2.5 py-1 text-xs text-foreground whitespace-nowrap z-10"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {tooltip.word} — {tooltip.freq}/분 ({tooltip.sessionLabel})
        </div>
      )}
    </div>
  );
}

export { FillerHeatmapInner };
