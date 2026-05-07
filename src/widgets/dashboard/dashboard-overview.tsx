"use client";

import { LayoutDashboard } from "lucide-react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { DashboardAnalytics } from "@/entities/analytics";
import type { SessionSummary } from "@/entities/session";
import { cn } from "@/shared/lib/cn";
import { getScoreColor, useFormatDuration } from "@/shared/lib/format";
import { Stat } from "@/shared/ui";
import { DashboardEmpty } from "./dashboard-empty";

const ScoreTrendChart = dynamic(
  () =>
    import("@/widgets/history/score-trend-chart").then((m) => ({
      default: m.ScoreTrendChartInner,
    })),
  { ssr: false },
);

interface DashboardOverviewProps {
  sessions: SessionSummary[];
  analytics: DashboardAnalytics;
}

export function DashboardOverview({
  sessions,
  analytics,
}: DashboardOverviewProps) {
  const t = useTranslations("dashboard");
  const formatter = useFormatter();
  const formatDuration = useFormatDuration();

  if (sessions.length === 0) {
    return (
      <DashboardEmpty
        icon={LayoutDashboard}
        title={t("overview")}
        description={t("historyEmpty")}
      />
    );
  }

  const avgChange =
    (analytics.stats.changeRate.deliveryChange +
      analytics.stats.changeRate.contentChange) /
    2;
  const hasEnoughData = analytics.stats.changeRate.hasEnoughData;
  const changeValue = hasEnoughData
    ? `${avgChange >= 0 ? "+" : ""}${Math.round(avgChange)}`
    : "-";
  const changeTone = !hasEnoughData
    ? "muted"
    : avgChange >= 0
      ? "positive"
      : "negative";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Stat
          label={t("stats.totalSessions")}
          value={analytics.stats.totalSessions}
        />
        <Stat
          label={t("stats.changeRate")}
          value={changeValue}
          tone={changeTone}
        />
        <Stat
          label={t("stats.recentWeek")}
          value={analytics.stats.recentWeekSessions}
        />
      </div>

      <div className="mt-8">
        <ScoreTrendChart data={analytics.scoreTrends} />
      </div>

      <h2 className="text-lg font-semibold mt-10 mb-4">
        {t("recentSessions")}
      </h2>
      <div className="space-y-4">
        {sessions.slice(0, 3).map((session, i) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link href={`/results/${session.id}`}>
              <div className="flex items-center justify-between rounded-xl bg-card border border-border-default px-6 py-4 hover:border-border-strong transition-colors cursor-pointer">
                <div>
                  <p className="font-semibold">{session.jobTitle}</p>
                  <p className="text-sm text-secondary mt-1">
                    {t(
                      `interviewType.${session.interviewType}` as
                        | "interviewType.personality"
                        | "interviewType.technical"
                        | "interviewType.culture-fit",
                    )}{" "}
                    · {formatDuration(session.durationSec)} ·{" "}
                    {formatter.dateTime(new Date(session.createdAt), {
                      dateStyle: "medium",
                    })}
                  </p>
                </div>
                <div className="flex gap-4 text-sm shrink-0">
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-lg font-bold",
                        getScoreColor(session.deliveryScore),
                      )}
                    >
                      {session.deliveryScore ?? "-"}
                    </p>
                    <p className="text-xs text-muted">{t("stats.delivery")}</p>
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
                    <p className="text-xs text-muted">{t("stats.content")}</p>
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
