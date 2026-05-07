"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { Badge } from "./badge";

interface LockOverlayProps {
  plan: "pro" | "premium";
  title?: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
  children?: ReactNode;
  className?: string;
}

export function LockOverlay({
  plan,
  title,
  description,
  ctaHref = "/dashboard/billing",
  ctaLabel,
  children,
  className,
}: LockOverlayProps) {
  const tBilling = useTranslations("billing");
  const tCommon = useTranslations("common");
  const planLabel =
    plan === "pro" ? tCommon("planPro") : tCommon("planPremium");
  return (
    <div className={cn("relative", className)}>
      <div
        className="pointer-events-none select-none blur-sm opacity-40"
        aria-hidden
      >
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
        <Badge tone={plan === "premium" ? "purple" : "indigo"}>
          {tCommon("planExclusive", { plan: planLabel })}
        </Badge>
        {title && <p className="font-medium">{title}</p>}
        {description && (
          <p className="text-sm text-secondary max-w-xs">{description}</p>
        )}
        <Link
          href={ctaHref}
          className="mt-2 px-5 py-2 rounded-lg text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
        >
          {ctaLabel ?? tBilling("upgrade")}
        </Link>
      </div>
    </div>
  );
}
