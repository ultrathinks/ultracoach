"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type {
  BodyLanguageData,
  DashboardAnalytics,
} from "@/entities/analytics";
import { Button } from "@/shared/ui";
import { BodyLanguagePanelInner } from "@/widgets/history/body-language-panel";
import { FillerHeatmapInner } from "@/widgets/history/filler-heatmap";

const StarRadarChart = dynamic(
  () =>
    import("@/widgets/history/star-radar-chart").then((m) => ({
      default: m.StarRadarChartInner,
    })),
  { ssr: false },
);

interface DashboardWeaknessesProps {
  analytics: DashboardAnalytics;
  bodyLanguage: BodyLanguageData;
}

export function DashboardWeaknesses({
  analytics,
  bodyLanguage,
}: DashboardWeaknessesProps) {
  const isEmpty =
    analytics.starRadar.length === 0 &&
    !bodyLanguage.hasData &&
    analytics.fillerHeatmap.sessions.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold gradient-text mb-3">약점 분석</h1>
        <p className="text-muted text-sm mb-8">
          면접을 완료하면 약점 분석을 확인할 수 있습니다
        </p>
        <Link href="/interview">
          <Button size="lg">면접 시작하기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">약점 분석</h1>
      <p className="text-secondary text-sm mb-8">
        STAR 충족률, 추임새, 바디랭귀지를 분석합니다
      </p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <StarRadarChart data={analytics.starRadar} />
          <BodyLanguagePanelInner data={bodyLanguage} />
        </div>

        <div className="mb-6">
          <FillerHeatmapInner data={analytics.fillerHeatmap} />
        </div>
      </motion.div>
    </div>
  );
}
