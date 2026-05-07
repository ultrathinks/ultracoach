"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useSessionStore } from "@/entities/session";
import { AVATARS, type AvatarId } from "@/shared/config/avatars";
import { cn } from "@/shared/lib/cn";

interface AvatarSummary {
  id: AvatarId;
  name: string;
  description: string;
  persona: "kind" | "strict" | "technical";
  previewImage: string;
  plan: "free" | "pro" | "premium";
  unlocked: boolean;
}

const PERSONA_RING: Record<AvatarSummary["persona"], string> = {
  kind: "ring-indigo",
  strict: "ring-yellow",
  technical: "ring-purple",
};

const PERSONA_LABEL_KEY = {
  kind: "personaLabel.kind",
  strict: "personaLabel.strict",
  technical: "personaLabel.technical",
} as const satisfies Record<AvatarSummary["persona"], string>;

export function AvatarPicker({ label }: { label: string }) {
  const t = useTranslations("avatar");
  const tCommon = useTranslations("common");
  const selectedAvatarId = useSessionStore((s) => s.avatarId);
  const setAvatar = useSessionStore((s) => s.setAvatar);
  const [avatars, setAvatars] = useState<AvatarSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/avatars")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json) => {
        if (!cancelled) setAvatars(json.data);
      })
      .catch(() => {
        if (!cancelled) {
          setAvatars(
            AVATARS.map((a) => ({
              id: a.id,
              name: a.name,
              description: a.description,
              persona: a.persona,
              previewImage: a.previewImage,
              plan: a.plan,
              unlocked: a.plan === "free",
            })),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!avatars) {
    return (
      <div>
        <p className="text-sm text-secondary mb-2">{label}</p>
        <div
          className="h-16 rounded-xl bg-card border border-border-subtle animate-pulse"
          aria-label={t("loadingLabel")}
        />
      </div>
    );
  }

  const selected = avatars.find((a) => a.id === selectedAvatarId);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm text-secondary">{label}</p>
        {selected && (
          <p className="text-xs text-muted">
            <span className="text-foreground">{selected.name}</span>
            <span className="mx-1.5">·</span>
            {t(PERSONA_LABEL_KEY[selected.persona])}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {avatars.map((a) => {
          const isSelected = a.id === selectedAvatarId;
          const isLocked = !a.unlocked;
          const ring = isSelected
            ? `ring-2 ${PERSONA_RING[a.persona]}`
            : "ring-1 ring-border-subtle";
          const planLabel =
            a.plan === "premium" ? tCommon("planPremium") : tCommon("planPro");
          return (
            <AvatarButton
              key={a.id}
              avatar={a}
              isSelected={isSelected}
              isLocked={isLocked}
              ring={ring}
              lockedTitle={t("lockedTitle", { name: a.name, plan: planLabel })}
              selectAria={t("selectAria", { name: a.name })}
              onSelect={() => setAvatar(a.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function AvatarButton({
  avatar,
  isSelected,
  isLocked,
  ring,
  lockedTitle,
  selectAria,
  onSelect,
}: {
  avatar: AvatarSummary;
  isSelected: boolean;
  isLocked: boolean;
  ring: string;
  lockedTitle: string;
  selectAria: string;
  onSelect: () => void;
}) {
  const initial = avatar.name.slice(0, 1);

  if (isLocked) {
    return (
      <Link
        href="/dashboard/billing"
        title={lockedTitle}
        aria-label={lockedTitle}
        className={cn(
          "relative size-12 rounded-full overflow-hidden bg-card transition-all opacity-60 hover:opacity-100",
          ring,
        )}
      >
        <AvatarImage avatar={avatar} initial={initial} />
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Lock className="w-3.5 h-3.5 text-white" />
        </div>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      title={avatar.description}
      aria-pressed={isSelected}
      aria-label={selectAria}
      className={cn(
        "relative size-12 rounded-full overflow-hidden bg-card transition-all cursor-pointer",
        ring,
        !isSelected && "hover:ring-border-default",
      )}
    >
      <AvatarImage avatar={avatar} initial={initial} />
    </button>
  );
}

function AvatarImage({
  avatar,
  initial,
}: {
  avatar: AvatarSummary;
  initial: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-muted">
        {initial}
      </span>
    );
  }
  return (
    // biome-ignore lint/performance/noImgElement: static avatar preview
    <img
      src={avatar.previewImage}
      alt=""
      className="absolute inset-0 w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
