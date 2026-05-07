import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type Tone = "default" | "positive" | "negative" | "muted";

interface StatProps {
  label: string;
  value: ReactNode;
  tone?: Tone;
  className?: string;
}

const toneStyles: Record<Tone, string> = {
  default: "text-foreground",
  positive: "text-green",
  negative: "text-red",
  muted: "text-muted",
};

export function Stat({ label, value, tone = "default", className }: StatProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-card border border-border-default p-6 text-center",
        className,
      )}
    >
      <p className={cn("text-3xl font-bold tabular-nums", toneStyles[tone])}>
        {value}
      </p>
      <p className="text-sm text-secondary mt-2">{label}</p>
    </div>
  );
}
