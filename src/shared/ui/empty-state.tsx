import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  cta?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  cta,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16",
        className,
      )}
    >
      {icon && (
        <div className="text-muted mb-4 [&>svg]:w-12 [&>svg]:h-12">{icon}</div>
      )}
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-secondary mt-2 max-w-sm">{description}</p>
      )}
      {cta && <div className="mt-6">{cta}</div>}
    </div>
  );
}
