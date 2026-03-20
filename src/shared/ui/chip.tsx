import { cn } from "@/shared/lib/cn";
import type { HTMLAttributes } from "react";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  active?: boolean;
}

export function Chip({ active, className, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-3 py-1 text-[13px] font-medium transition-all cursor-pointer",
        active
          ? "bg-indigo/15 text-indigo border border-indigo/30"
          : "bg-card border border-white/[0.06] text-muted hover:text-secondary hover:border-white/[0.08]",
        className,
      )}
      {...props}
    />
  );
}
