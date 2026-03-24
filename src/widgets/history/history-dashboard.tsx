"use client";

import type { DashboardAnalytics } from "@/entities/analytics";
import { Button } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";

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

interface HistoryDashboardProps {
  sessions: SessionSummary[];
  analytics: DashboardAnalytics;
}

const typeLabel: Record<string, string> = {
  personality: "인성",
  technical: "기술",
  "culture-fit": "컬처핏",
};

const modeLabel: Record<string, string> = {
  real: "실전",
  practice: "연습",
};

function getScoreColor(score: number | null) {
  if (score === null) return "text-muted";
  if (score >= 80) return "text-green";
  if (score >= 60) return "text-yellow";
  return "text-red";
}

function formatDuration(sec: number | null) {
  if (!sec) return "-";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}분 ${s}초`;
}

export function HistoryDashboard({ sessions, analytics }: HistoryDashboardProps) {
  if (sessions.length === 0) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-bold mb-3">면접 기록</h1>
        <p className="text-muted text-lg mb-10">아직 면접 기록이 없습니다</p>
        <Link href="/interview">
          <Button size="lg">면접 시작하기</Button>
        </Link>
      </div>
    );
  }

  const avgChange =
    (analytics.stats.changeRate.deliveryChange +
      analytics.stats.changeRate.contentChange) /
    2;

  return (
    <div className="max-w-4xl mx-auto px-6 py-20 lg:py-28">
      <h1 className="text-4xl font-bold mb-12">면접 기록</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        <div className="rounded-xl bg-card border border-white/[0.1] p-5 text-center">
          <p className="text-3xl font-bold">{analytics.stats.totalSessions}</p>
          <p className="text-sm text-secondary mt-1.5">총 세션</p>
        </div>
        <div className="rounded-xl bg-card border border-white/[0.1] p-5 text-center">
          <p
            className={cn(
              "text-3xl font-bold",
              !analytics.stats.changeRate.hasEnoughData
                ? "text-muted"
                : avgChange >= 0
                  ? "text-green"
                  : "text-red",
            )}
          >
            {analytics.stats.changeRate.hasEnoughData
              ? `${avgChange >= 0 ? "+" : ""}${Math.round(avgChange)}`
              : "-"}
          </p>
          <p className="text-sm text-secondary mt-1.5">첫 세션 대비 변화</p>
        </div>
        <div className="rounded-xl bg-card border border-white/[0.1] p-5 text-center">
          <p className="text-3xl font-bold">{analytics.stats.recentWeekSessions}</p>
          <p className="text-sm text-secondary mt-1.5">최근 7일</p>
        </div>
      </div>

      {/* Charts */}
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
                    {typeLabel[session.interviewType] ?? session.interviewType} ·{" "}
                    {modeLabel[session.mode] ?? session.mode} ·{" "}
                    {formatDuration(session.durationSec)} ·{" "}
                    {new Date(session.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <div className="flex gap-5 text-sm shrink-0">
                  <div className="text-right">
                    <p className={cn("text-lg font-bold", getScoreColor(session.deliveryScore))}>
                      {session.deliveryScore ?? "-"}
                    </p>
                    <p className="text-xs text-muted">전달력</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-lg font-bold", getScoreColor(session.contentScore))}>
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
