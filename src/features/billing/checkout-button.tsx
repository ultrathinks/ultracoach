"use client";

import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { UserPlan } from "@/shared/lib/permissions";
import { Button, useToast } from "@/shared/ui";

interface CheckoutButtonProps {
  plan: Exclude<UserPlan, "free">;
  customerKey: string;
  customerEmail: string | null;
  customerName: string | null;
  className?: string;
  children: React.ReactNode;
}

export function CheckoutButton({
  plan,
  customerKey,
  customerEmail,
  customerName,
  className,
  children,
}: CheckoutButtonProps) {
  const t = useTranslations("billing");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleClick = useCallback(async () => {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
      toast.show(t("checkoutKeyMissing"), { tone: "error" });
      return;
    }
    setLoading(true);
    try {
      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey });
      const origin = window.location.origin;
      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: `${origin}/billing/success?plan=${plan}`,
        failUrl: `${origin}/billing/fail`,
        customerEmail: customerEmail ?? undefined,
        customerName: customerName ?? undefined,
      });
    } catch (err) {
      console.error("toss requestBillingAuth failed:", err);
      toast.show(t("checkoutOpenFailed"), { tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [plan, customerKey, customerEmail, customerName, toast, t]);

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? t("checkoutLoading") : children}
    </Button>
  );
}
