"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { cn } from "@/shared/lib/cn";

const LOCALE_COOKIE = "ultracoach:language";
const LOCALES = ["ko", "en"] as const;
type SupportedLocale = (typeof LOCALES)[number];

export function LocaleSwitcher() {
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();

  function setLocale(next: SupportedLocale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={tCommon("loading")}
      className="inline-flex rounded-full bg-card border border-border-subtle p-0.5 text-xs"
    >
      {LOCALES.map((code) => {
        const isActive = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={isActive}
            className={cn(
              "px-2.5 py-1 rounded-full transition-colors cursor-pointer",
              isActive
                ? "bg-white/[0.08] text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {tCommon(code)}
          </button>
        );
      })}
    </div>
  );
}
