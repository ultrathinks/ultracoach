import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type Variant = "ghost" | "primary" | "danger";
type Size = "sm" | "md";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  pressed?: boolean;
}

const sizeStyles: Record<Size, string> = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
};

const variantStyles: Record<Variant, string> = {
  ghost: "bg-card border border-border text-foreground hover:bg-card-hover",
  primary: "bg-foreground text-background hover:bg-foreground/90",
  danger: "bg-red text-white hover:bg-red/90",
};

const pressedStyle =
  "bg-indigo/15 text-indigo border border-indigo/30 hover:bg-indigo/20";

export function IconButton({
  variant = "ghost",
  size = "md",
  pressed = false,
  className,
  type,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type ?? "button"}
      aria-pressed={pressed || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
        sizeStyles[size],
        pressed ? pressedStyle : variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
