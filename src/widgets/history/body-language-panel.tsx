"use client";

import type { BodyLanguageData } from "@/entities/analytics";

interface BodyLanguagePanelProps {
  data: BodyLanguageData;
}

function TrendIndicator({ trend }: { trend: "up" | "down" | "flat" | "none" }) {
  switch (trend) {
    case "up":
      return <span className="text-green text-sm ml-1.5">▲</span>;
    case "down":
      return <span className="text-red text-sm ml-1.5">▼</span>;
    case "flat":
      return <span className="text-muted text-sm ml-1.5">—</span>;
    case "none":
      return null;
  }
}

function BodyLanguagePanelInner({ data }: BodyLanguagePanelProps) {
  if (!data.hasData) {
    return (
      <div className="rounded-xl bg-card border border-white/[0.1] p-6">
        <h3 className="text-base font-semibold mb-4">바디랭귀지</h3>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-secondary text-sm">
            카메라를 켜고 면접하면 바디랭귀지를 분석할 수 있어요
          </p>
        </div>
      </div>
    );
  }

  const hasTrends = data.categories.some((c) => c.trend !== "none");

  return (
    <div className="rounded-xl bg-card border border-white/[0.1] p-6">
      <h3 className="text-base font-semibold mb-4">바디랭귀지</h3>
      <div className="space-y-5">
        {data.categories.map((category) => (
          <div key={category.key}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">{category.label}</span>
              <div className="flex items-center">
                <span className="text-2xl font-bold">{category.score}</span>
                <TrendIndicator trend={category.trend} />
              </div>
            </div>
            <div className="h-2 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo transition-all duration-500"
                style={{ width: `${category.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {!hasTrends && (
        <p className="text-muted text-sm mt-4 text-center">
          추이 변화는 2개 이상 세션에서 확인할 수 있어요
        </p>
      )}
    </div>
  );
}

export { BodyLanguagePanelInner };
