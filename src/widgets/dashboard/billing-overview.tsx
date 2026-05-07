"use client";

import { useRouter } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { CheckoutButton } from "@/features/billing/checkout-button";
import { cn } from "@/shared/lib/cn";
import { getPartnerLabel, type PartnerInfo } from "@/shared/lib/partner";
import { Badge, Button, Card, ConfirmDialog, useToast } from "@/shared/ui";

interface PaymentRow {
  id: string;
  amount: number;
  status: string;
  receiptUrl: string | null;
  approvedAt: string | null;
  createdAt: string;
}

interface SubscriptionInfo {
  id: string;
  plan: "pro" | "premium";
  status: "active" | "past_due" | "canceled" | "paused";
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface BillingOverviewProps {
  currentPlan: "free" | "pro" | "premium";
  subscription: SubscriptionInfo | null;
  payments: PaymentRow[];
  customerKey: string;
  customerEmail: string | null;
  customerName: string | null;
  role: "user" | "admin" | "demo";
  partner: PartnerInfo | null;
}

export function BillingOverview({
  currentPlan,
  subscription,
  payments,
  customerKey,
  customerEmail,
  customerName,
  role,
  partner,
}: BillingOverviewProps) {
  const t = useTranslations("billing");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const formatter = useFormatter();
  const locale = useLocale();
  const toast = useToast();
  const [busy, setBusy] = useState<"cancel" | "resume" | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const planLabel = (plan: "free" | "pro" | "premium") =>
    plan === "premium"
      ? tCommon("planPremium")
      : plan === "pro"
        ? tCommon("planPro")
        : tCommon("planFree");

  const PLANS = [
    {
      id: "free" as const,
      name: t("plans.starter"),
      amount: 0,
      description: t("plans.starterDesc"),
      features: [
        t("plans.starterFeature1"),
        t("plans.starterFeature2"),
        t("plans.starterFeature3"),
      ],
    },
    {
      id: "pro" as const,
      name: t("plans.pro"),
      amount: 19900,
      description: t("plans.proDesc"),
      features: [
        t("plans.proFeature1"),
        t("plans.proFeature2"),
        t("plans.proFeature3"),
        t("plans.proFeature4"),
      ],
    },
    {
      id: "premium" as const,
      name: t("plans.premium"),
      amount: 39900,
      description: t("plans.premiumDesc"),
      features: [
        t("plans.premiumFeature1"),
        t("plans.premiumFeature2"),
        t("plans.premiumFeature3"),
        t("plans.premiumFeature4"),
      ],
    },
  ];

  const handleCancel = useCallback(async () => {
    setBusy("cancel");
    try {
      const res = await fetch("/api/subscriptions/current", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelAtPeriodEnd: true }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      toast.show(t("cancelReserved"), { tone: "success" });
      setCancelOpen(false);
      router.refresh();
    } catch {
      toast.show(t("cancelFailed"), { tone: "error" });
    } finally {
      setBusy(null);
    }
  }, [toast, t, router]);

  const handleResume = useCallback(async () => {
    setBusy("resume");
    try {
      const res = await fetch("/api/subscriptions/current/resume", {
        method: "POST",
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      toast.show(t("resumeSuccess"), { tone: "success" });
      router.refresh();
    } catch {
      toast.show(t("resumeFailed"), { tone: "error" });
    } finally {
      setBusy(null);
    }
  }, [toast, t, router]);

  const partnerLabel = getPartnerLabel(partner, locale);

  return (
    <div className="space-y-10">
      {partner && partnerLabel && (
        <Card className="p-6 border-green/30 bg-green/[0.04]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-green/15 flex items-center justify-center text-lg shrink-0">
              🎓
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{partnerLabel}</p>
              <p className="text-xs text-secondary mt-1">
                {t("eduCardSubtitle", { plan: planLabel(currentPlan) })}
              </p>
            </div>
            <Badge tone="green">{t("eduCardTitle")}</Badge>
          </div>
        </Card>
      )}
      {role === "demo" && (
        <Card className="p-6 border-yellow/30 bg-yellow/[0.04]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-yellow/15 flex items-center justify-center text-lg shrink-0">
              🎬
            </div>
            <p className="text-sm flex-1">{t("demoNotice")}</p>
          </div>
        </Card>
      )}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t("currentPlan")}</h2>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              tone={
                currentPlan === "premium"
                  ? "purple"
                  : currentPlan === "pro"
                    ? "indigo"
                    : "neutral"
              }
            >
              {planLabel(currentPlan)}
            </Badge>
            {subscription ? (
              <span className="text-sm text-secondary">
                {t("nextBillingDate")}{" "}
                <span className="text-foreground font-medium">
                  {formatter.dateTime(new Date(subscription.currentPeriodEnd), {
                    dateStyle: "medium",
                  })}
                </span>
                {subscription.cancelAtPeriodEnd && (
                  <span className="ml-2 text-yellow">
                    ({t("cancelReservation")})
                  </span>
                )}
              </span>
            ) : currentPlan === "free" ? (
              <span className="text-sm text-secondary">{t("freeUsing")}</span>
            ) : partner ? (
              <span className="text-sm text-secondary">
                {t("eduFreeUsing")}
              </span>
            ) : role === "demo" ? (
              <span className="text-sm text-secondary">
                {t("demoFreeUsing")}
              </span>
            ) : null}
          </div>
          {subscription &&
            (subscription.cancelAtPeriodEnd ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResume}
                disabled={busy !== null}
              >
                {t("resumeCancel")}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCancelOpen(true)}
                disabled={busy !== null}
              >
                {t("cancelSubscription")}
              </Button>
            ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">{t("changePlan")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isUpgradable = plan.id !== "free" && !isCurrent;
            return (
              <div
                key={plan.id}
                className={cn(
                  "rounded-xl bg-card border p-6 flex flex-col",
                  isCurrent ? "border-indigo/40" : "border-border-subtle",
                )}
              >
                <p className="text-sm text-muted mb-1">{plan.name}</p>
                <p className="text-3xl font-bold mb-1">
                  {plan.amount === 0
                    ? tCommon("planFree")
                    : tCommon("currencyKrw", { value: plan.amount })}
                </p>
                <p className="text-sm text-muted mb-6">
                  {tCommon("vatIncluded")}
                </p>
                <ul className="space-y-2 text-sm text-secondary mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="secondary" size="md" disabled>
                    {t("thisIsCurrent")}
                  </Button>
                ) : isUpgradable ? (
                  <CheckoutButton
                    plan={plan.id}
                    customerKey={customerKey}
                    customerEmail={customerEmail}
                    customerName={customerName}
                  >
                    {currentPlan === "free"
                      ? t("upgrade")
                      : plan.id === "premium"
                        ? t("upgradeTo", { plan: planLabel("premium") })
                        : t("switchTo", { plan: planLabel("pro") })}
                  </CheckoutButton>
                ) : (
                  <Button variant="ghost" size="md" disabled>
                    -
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">{t("history.title")}</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted">{t("history.empty")}</p>
        ) : (
          <div className="rounded-xl bg-card border border-border-subtle overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border-subtle bg-white/[0.02]">
                <tr className="text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">{t("history.date")}</th>
                  <th className="px-4 py-3 font-medium">
                    {t("history.amount")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t("history.status")}
                  </th>
                  <th className="px-4 py-3 font-medium text-right">
                    {t("history.receipt")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border-subtle last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      {formatter.dateTime(
                        new Date(p.approvedAt ?? p.createdAt),
                        { dateStyle: "medium" },
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {tCommon("currencyKrw", { value: p.amount })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          p.status === "done"
                            ? "green"
                            : p.status === "failed"
                              ? "red"
                              : "neutral"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.receiptUrl ? (
                        <a
                          href={p.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo hover:underline"
                        >
                          {t("history.view")}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => busy === null && setCancelOpen(false)}
        onConfirm={handleCancel}
        title={t("cancelSubscription")}
        description={t("cancelConfirm")}
        tone="danger"
        confirmLabel={t("cancelSubscription")}
        busy={busy === "cancel"}
      />
    </div>
  );
}
