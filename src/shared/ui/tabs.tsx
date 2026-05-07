"use client";

import { cn } from "@/shared/lib/cn";

interface TabItem<T extends string = string> {
  id: T;
  label: string;
  badge?: string;
}

interface TabsProps<T extends string = string> {
  items: readonly TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

export function Tabs<T extends string = string>({
  items,
  active,
  onChange,
  className,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 p-1 rounded-lg bg-card border border-border-subtle",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
              isActive
                ? "bg-white/[0.08] text-foreground"
                : "text-muted hover:text-secondary",
            )}
          >
            {item.label}
            {item.badge && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-white/[0.08] text-xs">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
