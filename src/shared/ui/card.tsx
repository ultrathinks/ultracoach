import { cn } from "@/shared/lib/cn";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export function Card({ glass, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-4",
        glass ? "glass" : "bg-card border border-white/[0.06]",
        className,
      )}
      {...props}
    />
  );
}
