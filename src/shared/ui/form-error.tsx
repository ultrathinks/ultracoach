import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type Tone = "error" | "warning";

interface FormErrorProps extends HTMLAttributes<HTMLParagraphElement> {
  tone?: Tone;
}

const toneStyles: Record<Tone, string> = {
  error: "text-red",
  warning: "text-yellow",
};

export function FormError({
  tone = "error",
  className,
  children,
  ...props
}: FormErrorProps) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={cn("text-sm mt-2", toneStyles[tone], className)}
      {...props}
    >
      {children}
    </p>
  );
}
