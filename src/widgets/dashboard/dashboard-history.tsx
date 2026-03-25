"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { DashboardAnalytics } from "@/entities/analytics";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui";

const ScoreTrendChart = dynamic(
  () =>
    import("@/widgets/history/score-trend-chart").then((m) => ({
      default: m.ScoreTrendChartInner,
    })),
  { ssr: false },
);

const TypeComparisonChart = dynamic(
  () =>
    import("@/widgets/history/type-comparison-chart").then((m) => ({
      default: m.TypeComparisonChartInner,
    })),
  { ssr: false },
);

const typeLabel: Record<string, string> = {
  personality: "인성",
  technical: "기술",
  "culture-fit": "컬처핏",
};

const modeLabel: Record<string, string> = {
  real: "실전",
  practice: "연습",
};

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted";
  if (score >= 80) return "text-green";
  if (score >= 60) return "text-yellow";
  return "text-red";
}

function formatDuration(sec: number | null): string {
  if (!sec) return "-";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}분 ${s}초`;
}

interface SessionSummary {
  id: string;
  jobTitle: string;
  interviewType: string;
  mode: string;
  deliveryScore: number | null;
  contentScore: number | null;
  durationSec: number | null;
  createdAt: string;
}

interface DashboardHistoryProps {
  sessions: SessionSummary[];
  analytics: DashboardAnalytics;
}

export function DashboardHistory({
  sessions,
  analytics,
}: DashboardHistoryProps) {
  if (sessions.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold gradient-text mb-3">면접 기록</h1>
        <p className="text-muted text-sm mb-8">아직 면접 기록이 없습니다</p>
        <Link href="/interview">
          <Button size="lg">면접 시작하기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">면접 기록</h1>

      <div className="space-y-6 mb-10">
        <ScoreTrendChart data={analytics.scoreTrends} />
        <TypeComparisonChart data={analytics.typeComparison} />
      </div>

      <div className="space-y-3">
        {sessions.map((session, i) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link href={`/results/${session.id}`}>
              <div className="flex items-center justify-between rounded-xl bg-card border border-white/[0.1] px-6 py-5 hover:border-white/[0.15] transition-colors cursor-pointer">
                <div>
                  <p className="font-semibold">{session.jobTitle}</p>
                  <p className="text-sm text-secondary mt-1">
                    {typeLabel[session.interviewType] ?? session.interviewType}{" "}
                    · {modeLabel[session.mode] ?? session.mode} ·{" "}
                    {formatDuration(session.durationSec)} ·{" "}
                    {new Date(session.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <div className="flex gap-5 text-sm shrink-0">
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-lg font-bold",
                        getScoreColor(session.deliveryScore),
                      )}
                    >
                      {session.deliveryScore ?? "-"}
                    </p>
                    <p className="text-xs text-muted">전달력</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-lg font-bold",
                        getScoreColor(session.contentScore),
                      )}
                    >
                      {session.contentScore ?? "-"}
                    </p>
                    <p className="text-xs text-muted">답변력</p>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
