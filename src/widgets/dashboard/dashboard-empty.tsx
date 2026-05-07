"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui";

interface DashboardEmptyProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function DashboardEmpty({
  icon: Icon,
  title,
  description,
}: DashboardEmptyProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-14 h-14 rounded-full bg-card border border-border-subtle flex items-center justify-center mb-6">
        <Icon className="w-6 h-6 text-muted" />
      </div>
      <h1 className="text-xl font-semibold mb-2">{title}</h1>
      <p className="text-sm text-muted max-w-sm mb-8">{description}</p>
      <Link href="/interview">
        <Button size="lg">{t("startInterview")}</Button>
      </Link>
    </div>
  );
}
