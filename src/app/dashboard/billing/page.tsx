"use client";

import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "₩0",
    period: "영구 무료",
    current: true,
    features: [
      "월 5회 면접 연습",
      "기본 피드백 리포트",
      "점수 추이 차트",
      "추임새 분석",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₩19,900",
    period: "월",
    current: false,
    features: [
      "무제한 면접 연습",
      "심층 AI 피드백",
      "STAR 충족률 분석",
      "바디랭귀지 상세 리포트",
      "드릴 모드",
      "맞춤 액션 플랜",
      "우선 지원",
    ],
  },
];

export default function BillingPage() {
  const [showToast, setShowToast] = useState(false);

  function handleUpgrade() {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Billing</h1>
      <p className="text-secondary text-sm mb-8">
        플랜을 선택하고 더 많은 기능을 이용하세요
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative rounded-xl border p-6 transition-colors",
              plan.id === "pro"
                ? "border-indigo/50 bg-indigo/[0.04]"
                : "border-white/[0.06] bg-card",
            )}
          >
            {plan.current && (
              <span className="absolute top-4 right-4 rounded-full bg-green/10 px-2.5 py-0.5 text-xs font-medium text-green">
                현재 플랜
              </span>
            )}

            {plan.id === "pro" && (
              <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-indigo/10 px-2.5 py-0.5 text-xs font-medium text-indigo">
                <Sparkles className="h-3 w-3" />
                추천
              </span>
            )}

            <h2 className="text-lg font-bold mb-1">{plan.name}</h2>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold">{plan.price}</span>
              {plan.period !== "영구 무료" && (
                <span className="text-sm text-muted">/ {plan.period}</span>
              )}
            </div>

            <ul className="space-y-2.5 mb-6">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-secondary"
                >
                  <Check className="h-4 w-4 text-green shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            {plan.current ? (
              <Button variant="secondary" disabled className="w-full">
                현재 이용 중
              </Button>
            ) : (
              <Button onClick={handleUpgrade} className="w-full">
                업그레이드
              </Button>
            )}
          </div>
        ))}
      </div>

      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl glass border border-white/[0.1] px-6 py-3 text-sm text-foreground shadow-lg animate-in fade-in slide-in-from-bottom-4">
          결제 기능은 준비 중입니다
        </div>
      )}
    </div>
  );
}
