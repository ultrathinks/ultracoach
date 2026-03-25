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
import { cn } from "@/shared/lib/cn";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/history", label: "면접 기록", icon: History },
  { href: "/dashboard/weaknesses", label: "약점 분석", icon: Target },
  { href: "/dashboard/actions", label: "액션 플랜", icon: ListChecks },
  { href: "/dashboard/learn", label: "학습하기", icon: BookOpen },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-16 z-30 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-12">
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar -mb-px">
          {links.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  active
                    ? "border-indigo text-foreground"
                    : "border-transparent text-muted hover:text-secondary",
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/interview"
          className="hidden sm:inline-flex items-center gap-2 ml-4 px-4 py-1.5 text-sm font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-all"
        >
          <Play className="w-3.5 h-3.5" />
          면접 시작
        </Link>
      </div>
    </div>
  );
}
