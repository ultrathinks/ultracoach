import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface LinkButtonProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-foreground text-background hover:bg-foreground/90",
  secondary:
    "bg-card border border-border text-foreground hover:bg-card-hover hover:border-border-default",
  ghost: "text-muted hover:text-secondary hover:bg-white/[0.04]",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-4 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-lg",
  lg: "px-7 py-3 text-base rounded-xl",
};

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-200",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  );
}
