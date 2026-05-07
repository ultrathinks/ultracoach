import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  gradient?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  gradient,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4 mb-8", className)}
    >
      <div>
        <h1 className={cn("text-2xl font-bold", gradient && "gradient-text")}>
          {title}
        </h1>
        {description && (
          <p className="text-sm text-secondary mt-2">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
