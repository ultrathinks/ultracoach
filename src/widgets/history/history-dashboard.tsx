"use client";

import { Card } from "@/shared/ui";
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
      .map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${height - (v / max) * height}`)
      .join(" ");

  return (
    <Card className="overflow-hidden">
      <h3 className="text-sm font-medium mb-3">점수 추이</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20">
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
      <div className="flex gap-4 mt-2 text-xs text-secondary">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-indigo" />
          전달력
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-pink" />
          답변력
        </span>
      </div>
    </Card>
  );
}

export function HistoryDashboard({ sessions }: HistoryDashboardProps) {
  if (sessions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-bold mb-2">면접 기록</h1>
        <p className="text-secondary">아직 면접 기록이 없습니다.</p>
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
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <h1 className="text-2xl font-bold">면접 기록</h1>

      {/* stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <p className="text-2xl font-bold">{sessions.length}</p>
          <p className="text-xs text-secondary">총 세션</p>
        </Card>
        <Card className="text-center">
          <p className={cn("text-2xl font-bold", getScoreColor(avgDelivery))}>
            {avgDelivery ?? "-"}
          </p>
          <p className="text-xs text-secondary">평균 전달력</p>
        </Card>
        <Card className="text-center">
          <p className={cn("text-2xl font-bold", getScoreColor(avgContent))}>
            {avgContent ?? "-"}
          </p>
          <p className="text-xs text-secondary">평균 답변력</p>
        </Card>
      </div>

      {/* chart */}
      <MiniChart sessions={sessions} />

      {/* session list */}
      <div className="space-y-3">
        {sessions.map((session, i) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link href={`/results/${session.id}`}>
              <Card className="flex items-center justify-between hover:border-indigo/30 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-sm">{session.jobTitle}</p>
                  <p className="text-xs text-secondary">
                    {session.interviewType} · {session.mode} ·{" "}
                    {new Date(session.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className={getScoreColor(session.deliveryScore)}>
                    {session.deliveryScore ?? "-"}
                  </span>
                  <span className={getScoreColor(session.contentScore)}>
                    {session.contentScore ?? "-"}
                  </span>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
