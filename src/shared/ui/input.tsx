import { cn } from "@/shared/lib/cn";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={id} className="text-sm text-secondary">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "w-full rounded-xl bg-card border border-white/[0.1] px-5 py-3 text-base text-foreground placeholder:text-muted outline-none transition-colors focus:border-foreground/30",
          className,
        )}
        {...props}
      />
    </div>
  );
}
