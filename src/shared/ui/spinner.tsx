import { cn } from "@/shared/lib/cn";

type Size = "sm" | "md" | "lg";

interface SpinnerProps {
  size?: Size;
  className?: string;
  label?: string;
}

const sizeStyles: Record<Size, string> = {
  sm: "w-4 h-4 border",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-2",
};

export function Spinner({ size = "md", className, label }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label ?? "loading"}
      className={cn(
        "inline-block rounded-full border-foreground/20 border-t-foreground animate-spin",
        sizeStyles[size],
        className,
      )}
    />
  );
}
