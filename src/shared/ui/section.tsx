import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

interface SectionProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function Section({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn("mb-8", className)} {...props}>
      {(title || actions) && (
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && (
              <p className="text-sm text-secondary mt-1">{description}</p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
