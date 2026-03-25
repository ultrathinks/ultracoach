"use client";

import type { AiRecommendationData } from "@/entities/analytics";
import { useState } from "react";

interface AiRecommendationCardProps {
  data: AiRecommendationData;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  // Cut at last space to avoid mid-word truncation
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > maxLength * 0.6 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

function AiRecommendationCardInner({ data }: AiRecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (data.suggestion === "" && data.sessionDate === "") {
    return (
      <div className="rounded-xl bg-card border border-white/[0.1] p-6">
        <h3 className="text-base font-semibold mb-4">AI 추천</h3>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-secondary text-sm">
            면접 후 다음 세션을 위한 맞춤 제안을 받아보세요
          </p>
        </div>
      </div>
    );
  }

  if (data.suggestion === "") {
    return (
      <div className="rounded-xl bg-card border border-white/[0.1] p-6">
        <h3 className="text-base font-semibold mb-4">AI 추천</h3>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-secondary text-sm">
            이 세션에 대한 추천이 아직 없어요
          </p>
        </div>
      </div>
    );
  }

  const isLong = data.suggestion.length > 80;
  const displayText = expanded || !isLong ? data.suggestion : truncate(data.suggestion, 80);

  return (
    <div
      className="rounded-xl bg-card border border-white/[0.1] p-6 cursor-pointer select-none"
      onClick={() => setExpanded((prev) => !prev)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setExpanded((prev) => !prev);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">AI 추천</h3>
        {isLong && (
          <svg
            width={16}
            height={16}
            viewBox="0 0 16 16"
            fill="none"
            className="text-muted transition-transform duration-200"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div className="overflow-hidden transition-all duration-200 ease-in-out">
        <p className="text-sm text-secondary leading-relaxed">{displayText}</p>
      </div>
    </div>
  );
}

export { AiRecommendationCardInner };
