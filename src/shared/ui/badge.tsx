import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type Tone = "neutral" | "indigo" | "purple" | "yellow" | "green" | "red";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneStyles: Record<Tone, string> = {
  neutral: "bg-white/[0.06] text-secondary border-border-subtle",
  indigo: "bg-indigo/15 text-indigo border-indigo/30",
  purple: "bg-purple/15 text-purple border-purple/30",
  yellow: "bg-yellow/15 text-yellow border-yellow/30",
  green: "bg-green/15 text-green border-green/30",
  red: "bg-red/15 text-red border-red/30",
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  );
}
