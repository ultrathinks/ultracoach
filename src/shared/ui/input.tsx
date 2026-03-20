import { cn } from "@/shared/lib/cn";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-[13px] text-muted">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "w-full rounded-xl bg-card border border-white/[0.06] px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors focus:border-indigo/40",
          className,
        )}
        {...props}
      />
    </div>
  );
}
