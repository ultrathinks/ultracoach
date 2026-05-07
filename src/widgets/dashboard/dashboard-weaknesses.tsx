"use client";

import { Target } from "lucide-react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type {
  BodyLanguageData,
  DashboardAnalytics,
} from "@/entities/analytics";
import { BodyLanguagePanelInner } from "@/widgets/history/body-language-panel";
import { FillerHeatmapInner } from "@/widgets/history/filler-heatmap";
import { DashboardEmpty } from "./dashboard-empty";

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
  const t = useTranslations("dashboard");
  const isEmpty =
    analytics.starRadar.length === 0 &&
    !bodyLanguage.hasData &&
    analytics.fillerHeatmap.sessions.length === 0;

  if (isEmpty) {
    return (
      <DashboardEmpty
        icon={Target}
        title={t("weaknessTitle")}
        description={t("weaknessEmpty")}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{t("weaknessTitle")}</h1>
      <p className="text-secondary text-sm mb-8">{t("weaknessDesc")}</p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
