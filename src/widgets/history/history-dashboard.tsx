"use client";

import { Button } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { motion } from "motion/react";
import Link from "next/link";

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
}

function getScoreColor(score: number | null) {
  if (score === null) return "text-muted";
  if (score >= 80) return "text-green";
  if (score >= 60) return "text-yellow";
  return "text-red";
}

function MiniChart({ sessions }: { sessions: SessionSummary[] }) {
  const scores = sessions
    .filter((s) => s.deliveryScore !== null)
    .slice(-10)
    .map((s) => ({
      delivery: s.deliveryScore ?? 0,
      content: s.contentScore ?? 0,
    }));

  if (scores.length < 2) return null;

  const max = 100;
  const width = 300;
  const height = 80;
  const step = width / (scores.length - 1);

  const toPath = (values: number[]) =>
    values
      .map(
        (v, i) =>
          `${i === 0 ? "M" : "L"} ${i * step} ${height - (v / max) * height}`,
      )
      .join(" ");

  return (
    <div className="rounded-xl bg-card border border-white/[0.06] p-6">
      <h3 className="font-medium mb-5">점수 추이</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24">
        <path
          d={toPath(scores.map((s) => s.delivery))}
          fill="none"
          stroke="var(--color-indigo)"
          strokeWidth="2"
        />
        <path
          d={toPath(scores.map((s) => s.content))}
          fill="none"
          stroke="var(--color-pink)"
          strokeWidth="2"
        />
      </svg>
      <div className="flex gap-5 mt-4 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo" />
          전달력
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-pink" />
          답변력
        </span>
      </div>
    </div>
  );
}

function formatDuration(sec: number | null) {
  if (!sec) return "-";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}분 ${s}초`;
}

export function HistoryDashboard({ sessions }: HistoryDashboardProps) {
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

  const completed = sessions.filter((s) => s.deliveryScore !== null);
  const avgDelivery =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, s) => sum + (s.deliveryScore ?? 0), 0) /
            completed.length,
        )
      : null;
  const avgContent =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, s) => sum + (s.contentScore ?? 0), 0) /
            completed.length,
        )
      : null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-20 lg:py-28">
      <h1 className="text-4xl font-bold mb-12">면접 기록</h1>

      <div className="grid grid-cols-3 gap-5 mb-8">
        <div className="rounded-xl bg-card border border-white/[0.06] p-5 text-center">
          <p className="text-3xl font-bold">{sessions.length}</p>
          <p className="text-sm text-muted mt-1.5">총 세션</p>
        </div>
        <div className="rounded-xl bg-card border border-white/[0.06] p-5 text-center">
          <p className={cn("text-3xl font-bold", getScoreColor(avgDelivery))}>
            {avgDelivery ?? "-"}
          </p>
          <p className="text-sm text-muted mt-1.5">평균 전달력</p>
        </div>
        <div className="rounded-xl bg-card border border-white/[0.06] p-5 text-center">
          <p className={cn("text-3xl font-bold", getScoreColor(avgContent))}>
            {avgContent ?? "-"}
          </p>
          <p className="text-sm text-muted mt-1.5">평균 답변력</p>
        </div>
      </div>

      <div className="mb-10">
        <MiniChart sessions={sessions} />
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
              <div className="flex items-center justify-between rounded-xl bg-card border border-white/[0.06] px-6 py-5 hover:border-white/[0.12] transition-colors cursor-pointer">
                <div>
                  <p className="font-medium">{session.jobTitle}</p>
                  <p className="text-sm text-muted mt-1">
                    {session.interviewType} · {session.mode} ·{" "}
                    {formatDuration(session.durationSec)} ·{" "}
                    {new Date(session.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <div className="flex gap-6 text-base font-medium">
                  <span className={getScoreColor(session.deliveryScore)}>
                    {session.deliveryScore ?? "-"}
                  </span>
                  <span className={getScoreColor(session.contentScore)}>
                    {session.contentScore ?? "-"}
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
