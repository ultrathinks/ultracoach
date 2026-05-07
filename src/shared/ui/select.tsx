import type { SelectHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
}

export function Select({
  label,
  options,
  className,
  id,
  ...props
}: SelectProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={id} className="text-sm text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          className={cn(
            "w-full appearance-none rounded-xl bg-card border border-border-default pl-4 pr-9 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-foreground/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
            className,
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}
