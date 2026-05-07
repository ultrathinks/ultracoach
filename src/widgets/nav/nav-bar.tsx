"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { getPartnerLabel, type PartnerInfo } from "@/shared/lib/partner";
import { Badge } from "@/shared/ui";
import { LocaleSwitcher } from "./locale-switcher";

function RoleBadge({ role }: { role: "user" | "admin" | "demo" }) {
  const t = useTranslations("nav");
  if (role === "admin") return <Badge tone="purple">{t("adminBadge")}</Badge>;
  if (role === "demo") return <Badge tone="yellow">{t("demoBadge")}</Badge>;
  return null;
}

function PartnerBadge({ partner }: { partner: PartnerInfo | null }) {
  if (!partner) return null;
  return <Badge tone="green">EDU</Badge>;
}

function NavDropdownLink({
  href,
  label,
  onClick,
  isAdmin = false,
}: {
  href: string;
  label: string;
  onClick: () => void;
  isAdmin?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center px-4 py-2.5 text-sm text-secondary hover:text-foreground hover:bg-white/[0.04] transition-colors",
        isAdmin && "text-purple",
      )}
    >
      {label}
    </Link>
  );
}

function ProfileDropdown() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        e.target instanceof Node &&
        ref.current &&
        !ref.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!session?.user) return null;

  const isAdmin = session.user.role === "admin";
  const planLabel =
    session.user.plan === "premium"
      ? tCommon("planPremium")
      : session.user.plan === "pro"
        ? tCommon("planPro")
        : tCommon("planFree");
  const partnerLabel = getPartnerLabel(session.user.partner, locale);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label={t("profile")}
        aria-expanded={open}
        className="cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-foreground/30"
      >
        {session.user.image ? (
          // biome-ignore lint/performance/noImgElement: user avatar URL is external (Google OAuth)
          <img
            src={session.user.image}
            alt=""
            className="w-8 h-8 rounded-full ring-1 ring-white/10"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-xs font-semibold text-secondary">
            {session.user.name?.[0]?.toUpperCase() ??
              session.user.email?.[0]?.toUpperCase() ??
              "?"}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-card border border-border-default shadow-lg shadow-black/40 z-50 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate flex-1">
                {session.user.name ?? session.user.email?.split("@")[0]}
              </p>
              <Badge
                tone={
                  session.user.plan === "premium"
                    ? "purple"
                    : session.user.plan === "pro"
                      ? "indigo"
                      : "neutral"
                }
              >
                {planLabel}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted truncate">
              {session.user.email}
            </p>
            {(session.user.role === "admin" ||
              session.user.role === "demo" ||
              partnerLabel) && (
              <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                <RoleBadge role={session.user.role} />
                <PartnerBadge partner={session.user.partner} />
                {partnerLabel && (
                  <span className="text-xs text-secondary truncate">
                    🎓 {partnerLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="py-1.5">
            <NavDropdownLink
              href="/dashboard"
              label={t("dashboard")}
              onClick={() => setOpen(false)}
            />
            <NavDropdownLink
              href="/dashboard/profile"
              label={t("profile")}
              onClick={() => setOpen(false)}
            />
            <NavDropdownLink
              href="/dashboard/billing"
              label={t("billing")}
              onClick={() => setOpen(false)}
            />
            {isAdmin && (
              <NavDropdownLink
                href="/admin"
                label={t("admin")}
                onClick={() => setOpen(false)}
                isAdmin
              />
            )}
          </div>
          <div className="px-4 py-2.5 border-t border-border-subtle flex items-center justify-between gap-2">
            <span className="text-sm text-secondary">{t("language")}</span>
            <LocaleSwitcher />
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full text-left px-4 py-2.5 text-sm text-secondary hover:text-foreground hover:bg-white/[0.04] transition-colors border-t border-border-subtle cursor-pointer"
          >
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}

export function NavBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { data: session } = useSession();

  const links = [
    { href: "/interview", label: t("interview") },
    { href: "/dashboard", label: t("dashboard") },
  ];

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
        <Link href="/" className="text-lg font-bold text-foreground">
          UltraCoach
        </Link>

        <div className="flex items-center gap-6">
          {session?.user &&
            links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm transition-colors",
                  pathname === link.href ||
                    (link.href === "/dashboard" &&
                      pathname.startsWith("/dashboard"))
                    ? "text-foreground"
                    : "text-muted hover:text-secondary",
                )}
              >
                {link.label}
              </Link>
            ))}

          {session?.user ? (
            <ProfileDropdown />
          ) : (
            <>
              <LocaleSwitcher />
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="px-4 py-1.5 text-sm font-medium rounded-full border border-border text-secondary hover:text-foreground transition-colors cursor-pointer"
              >
                {t("login")}
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
