"use client";

import { cn } from "@/shared/lib/cn";
import {
  BookOpen,
  CreditCard,
  History,
  LayoutDashboard,
  ListChecks,
  Menu,
  Play,
  Target,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const coachingLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/history", label: "면접 기록", icon: History, exact: false },
  { href: "/dashboard/weaknesses", label: "약점 분석", icon: Target, exact: false },
  { href: "/dashboard/actions", label: "액션 플랜", icon: ListChecks, exact: false },
  { href: "/dashboard/learn", label: "학습하기", icon: BookOpen, exact: false },
];

const accountLinks = [
  { href: "/dashboard/profile", label: "프로필", icon: User, exact: false },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, exact: false },
];

function isActive(href: string, exact: boolean, pathname: string): boolean {
  if (exact) return pathname === href;
  return pathname.startsWith(href);
}

function NavItem({
  href,
  label,
  icon: Icon,
  exact,
  pathname,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact: boolean;
  pathname: string;
  onClick?: () => void;
}) {
  const active = isActive(href, exact, pathname);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-lg mx-2",
        active
          ? "border-l-2 border-indigo text-foreground bg-white/[0.04]"
          : "text-muted hover:text-secondary hover:bg-white/[0.04]",
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}

function SidebarContent({
  pathname,
  onLinkClick,
}: {
  pathname: string;
  onLinkClick?: () => void;
}) {
  return (
    <div className="flex flex-col h-full py-4">
      <nav className="flex flex-col gap-1">
        {coachingLinks.map((link) => (
          <NavItem
            key={link.href}
            href={link.href}
            label={link.label}
            icon={link.icon}
            exact={link.exact}
            pathname={pathname}
            onClick={onLinkClick}
          />
        ))}
      </nav>

      <hr className="border-glass-border my-2 mx-4" />

      <nav className="flex flex-col gap-1">
        {accountLinks.map((link) => (
          <NavItem
            key={link.href}
            href={link.href}
            label={link.label}
            icon={link.icon}
            exact={link.exact}
            pathname={pathname}
            onClick={onLinkClick}
          />
        ))}
      </nav>

      <div className="mt-auto px-4 pb-4 pt-2">
        <Link
          href="/interview"
          onClick={onLinkClick}
          className="mx-0 flex items-center justify-center gap-2 rounded-xl bg-indigo px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo/80"
        >
          <Play className="w-4 h-4" />
          면접 시작하기
        </Link>
      </div>
    </div>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar — hidden below md */}
      <aside className="hidden md:flex w-64 glass border-r border-glass-border flex-col shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile hamburger button — visible below md */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed top-[4.5rem] left-4 z-40 md:hidden glass rounded-lg p-2"
        aria-label="메뉴 열기"
      >
        <Menu size={24} />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />

            {/* Sidebar panel */}
            <motion.aside
              key="mobile-sidebar"
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: "tween", duration: 0.2 }}
              className="fixed top-16 left-0 bottom-0 z-50 w-64 glass flex flex-col md:hidden"
            >
              {/* Close button */}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors"
                aria-label="메뉴 닫기"
              >
                <X size={18} />
              </button>

              <SidebarContent
                pathname={pathname}
                onLinkClick={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
