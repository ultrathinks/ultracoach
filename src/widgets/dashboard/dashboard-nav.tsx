"use client";

import {
  BookOpen,
  CreditCard,
  History,
  LayoutDashboard,
  ListChecks,
  Play,
  Target,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";

interface NavLink {
  href: string;
  labelKey:
    | "overview"
    | "history"
    | "weaknesses"
    | "actions"
    | "learn"
    | "billing";
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const links: NavLink[] = [
  {
    href: "/dashboard",
    labelKey: "overview",
    icon: LayoutDashboard,
    exact: true,
  },
  { href: "/dashboard/history", labelKey: "history", icon: History },
  { href: "/dashboard/weaknesses", labelKey: "weaknesses", icon: Target },
  { href: "/dashboard/actions", labelKey: "actions", icon: ListChecks },
  { href: "/dashboard/learn", labelKey: "learn", icon: BookOpen },
  { href: "/dashboard/billing", labelKey: "billing", icon: CreditCard },
];

export function DashboardNav() {
  const t = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const pathname = usePathname();

  return (
    <div className="sticky top-16 z-30 border-b border-border-subtle bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-12">
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar -mb-px">
          {links.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            const Icon = link.icon;
            const label =
              link.labelKey === "billing" ? tNav("billing") : t(link.labelKey);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  active
                    ? "border-indigo text-foreground"
                    : "border-transparent text-muted hover:text-secondary",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/interview"
          className="hidden sm:inline-flex items-center gap-2 ml-4 px-4 py-1.5 text-sm font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-all"
        >
          <Play className="w-3.5 h-3.5" />
          {t("startInterview")}
        </Link>
      </div>
    </div>
  );
}
