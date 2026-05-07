import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type Size = "form" | "content" | "wide";

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: Size;
}

const sizeStyles: Record<Size, string> = {
  form: "max-w-2xl",
  content: "max-w-4xl",
  wide: "max-w-6xl",
};

export function PageContainer({
  size = "content",
  className,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full", sizeStyles[size], className)}
      {...props}
    />
  );
}
