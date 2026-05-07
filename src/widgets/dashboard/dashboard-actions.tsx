"use client";

import { ListChecks } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import type { DashboardAnalytics } from "@/entities/analytics";
import { ActionTrackerInner } from "@/widgets/history/action-tracker";
import { AiRecommendationCardInner } from "@/widgets/history/ai-recommendation-card";
import { DashboardEmpty } from "./dashboard-empty";

interface DashboardActionsProps {
  analytics: DashboardAnalytics;
}

export function DashboardActions({ analytics }: DashboardActionsProps) {
  const t = useTranslations("dashboard");
  const isEmpty =
    analytics.actionTracker.items.length === 0 &&
    analytics.actionTracker.sessionDate === "" &&
    analytics.aiRecommendation.suggestion === "" &&
    analytics.aiRecommendation.sessionDate === "";

  if (isEmpty) {
    return (
      <DashboardEmpty
        icon={ListChecks}
        title={t("actionsTitle")}
        description={t("actionsEmpty")}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{t("actionsTitle")}</h1>
      <p className="text-secondary text-sm mb-8">{t("actionsDesc")}</p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ActionTrackerInner data={analytics.actionTracker} />
          <AiRecommendationCardInner data={analytics.aiRecommendation} />
        </div>
      </motion.div>
    </div>
  );
}
