"use client";

import { useTranslations } from "next-intl";
import { Modal } from "@/shared/ui";

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

type ShortcutMessageKey = "space" | "r" | "p" | "m" | "f" | "t" | "help";

const KEYS: { key: string; messageKey: ShortcutMessageKey }[] = [
  { key: "Space", messageKey: "space" },
  { key: "R", messageKey: "r" },
  { key: "P", messageKey: "p" },
  { key: "M", messageKey: "m" },
  { key: "F", messageKey: "f" },
  { key: "T", messageKey: "t" },
  { key: "?", messageKey: "help" },
];

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  const t = useTranslations("interview.shortcuts");
  return (
    <Modal open={open} onClose={onClose} title={t("title")} size="md">
      <ul className="space-y-2">
        {KEYS.map((s) => (
          <li
            key={s.key}
            className="flex items-center justify-between text-sm py-2 border-b border-border-subtle last:border-b-0"
          >
            <span className="text-secondary">{t(s.messageKey)}</span>
            <kbd className="px-2 py-0.5 rounded bg-white/[0.08] text-foreground font-mono text-xs">
              {s.key}
            </kbd>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
