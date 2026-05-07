"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { PageContainer } from "@/shared/ui";

interface BillingSuccessClientProps {
  authKey: string;
  customerKey: string;
  plan: "pro" | "premium";
}

export function BillingSuccessClient({
  authKey,
  customerKey,
  plan,
}: BillingSuccessClientProps) {
  const t = useTranslations("billing");
  const router = useRouter();
  const startedRef = useRef(false);
  const [status, setStatus] = useState<"working" | "failed">("working");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function complete() {
      try {
        const issueRes = await fetch("/api/payment-methods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authKey, customerKey }),
        });
        if (!issueRes.ok) {
          const data = await issueRes.json().catch(() => ({}));
          throw new Error(
            data.detail ?? data.title ?? t("billingKeyIssueError"),
          );
        }

        const subRes = await fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        if (!subRes.ok) {
          const data = await subRes.json().catch(() => ({}));
          throw new Error(
            data.detail ?? data.title ?? t("subscriptionCreateError"),
          );
        }

        router.replace("/dashboard/billing?welcome=1");
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : t("checkoutGenericError"),
        );
        setStatus("failed");
      }
    }

    void complete();
  }, [authKey, customerKey, plan, router, t]);

  return (
    <PageContainer size="form" className="px-6 py-20 text-center">
      {status === "working" ? (
        <>
          <h1 className="text-2xl font-bold mb-2">{t("checkoutProcessing")}</h1>
          <p className="text-sm text-secondary">
            {t("checkoutProcessingDesc")}
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-2 text-red">{t("failed")}</h1>
          <p className="text-sm text-secondary mb-6">{errorMessage}</p>
          <button
            type="button"
            onClick={() => router.replace("/dashboard/billing")}
            className="text-sm text-indigo hover:underline"
          >
            {t("checkoutBackToBilling")}
          </button>
        </>
      )}
    </PageContainer>
  );
}
