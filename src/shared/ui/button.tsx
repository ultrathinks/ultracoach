import { cn } from "@/shared/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-indigo to-purple text-white shadow-lg shadow-indigo/20 hover:shadow-indigo/30 hover:brightness-110",
  secondary:
    "bg-card border border-border text-foreground hover:bg-card-hover hover:border-white/[0.08]",
  ghost: "text-muted hover:text-secondary hover:bg-white/[0.04]",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1 text-[13px] rounded-lg",
  md: "px-4 py-1.5 text-sm rounded-lg",
  lg: "px-5 py-2 text-sm rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  );
}
