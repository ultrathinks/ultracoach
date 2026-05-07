"use client";

import { History } from "lucide-react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type {
  BodyLanguageData,
  DashboardAnalytics,
} from "@/entities/analytics";
import type { SessionSummary } from "@/entities/session";
import { cn } from "@/shared/lib/cn";
import { getScoreColor, useFormatDuration } from "@/shared/lib/format";
import { Stat } from "@/shared/ui";
import { DashboardEmpty } from "@/widgets/dashboard/dashboard-empty";
import { ActionTrackerInner } from "@/widgets/history/action-tracker";
import { AiRecommendationCardInner } from "@/widgets/history/ai-recommendation-card";
import { BodyLanguagePanelInner } from "@/widgets/history/body-language-panel";
import { FillerHeatmapInner } from "@/widgets/history/filler-heatmap";

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

const StarRadarChart = dynamic(
  () =>
    import("@/widgets/history/star-radar-chart").then((m) => ({
      default: m.StarRadarChartInner,
    })),
  { ssr: false },
);

interface HistoryDashboardProps {
  sessions: SessionSummary[];
  analytics: DashboardAnalytics;
  bodyLanguage: BodyLanguageData;
}

export function HistoryDashboard({
  sessions,
  analytics,
  bodyLanguage,
}: HistoryDashboardProps) {
  const t = useTranslations("dashboard");
  const formatter = useFormatter();
  const formatDuration = useFormatDuration();

  if (sessions.length === 0) {
    return (
      <DashboardEmpty
        icon={History}
        title={t("historyTitle")}
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
    <div className="max-w-4xl mx-auto px-6 py-20 lg:py-28">
      <h1 className="text-4xl font-bold mb-12">{t("historyTitle")}</h1>

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

      <div className="space-y-6 mb-10">
        <ScoreTrendChart data={analytics.scoreTrends} />
        <TypeComparisonChart data={analytics.typeComparison} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="mt-12 mb-6">
          <h2 className="text-xl font-bold">{t("weaknessTitle")}</h2>
          <p className="text-secondary text-sm mt-1">{t("weaknessDesc")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <StarRadarChart data={analytics.starRadar} />
          <BodyLanguagePanelInner data={bodyLanguage} />
        </div>

        <div className="mb-10">
          <FillerHeatmapInner data={analytics.fillerHeatmap} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="mt-12 mb-6">
          <h2 className="text-xl font-bold">{t("actionsTitle")}</h2>
          <p className="text-secondary text-sm mt-1">{t("actionsDesc")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <ActionTrackerInner data={analytics.actionTracker} />
          <AiRecommendationCardInner data={analytics.aiRecommendation} />
        </div>
      </motion.div>

      <div className="space-y-4">
        {sessions.map((session, i) => (
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
