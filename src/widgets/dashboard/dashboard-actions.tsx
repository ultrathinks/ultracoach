"use client";

import { motion } from "motion/react";
import Link from "next/link";
import type { DashboardAnalytics } from "@/entities/analytics";
import { Button } from "@/shared/ui";
import { ActionTrackerInner } from "@/widgets/history/action-tracker";
import { AiRecommendationCardInner } from "@/widgets/history/ai-recommendation-card";

interface DashboardActionsProps {
  analytics: DashboardAnalytics;
}

export function DashboardActions({ analytics }: DashboardActionsProps) {
  const isEmpty =
    analytics.actionTracker.items.length === 0 &&
    analytics.actionTracker.sessionDate === "" &&
    analytics.aiRecommendation.suggestion === "" &&
    analytics.aiRecommendation.sessionDate === "";

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold gradient-text mb-3">액션 플랜</h1>
        <p className="text-muted text-sm mb-8">
          면접을 완료하면 맞춤 액션 플랜을 받을 수 있습니다
        </p>
        <Link href="/interview">
          <Button size="lg">면접 시작하기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">액션 플랜</h1>
      <p className="text-secondary text-sm mb-8">
        AI가 제안하는 다음 단계입니다
      </p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ActionTrackerInner data={analytics.actionTracker} />
          <AiRecommendationCardInner data={analytics.aiRecommendation} />
        </div>
      </motion.div>
    </div>
  );
}
