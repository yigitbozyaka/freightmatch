import * as React from "react";
import { cn } from "@/lib/ui/cn";

export type InputProps = React.ComponentPropsWithoutRef<"input"> & {
  error?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, id, ...props }, ref) => {
    const fallbackId = React.useId();
    const inputId = id ?? fallbackId;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="space-y-2">
        <input
          ref={ref}
          aria-describedby={errorId}
          aria-invalid={error ? true : undefined}
          className={cn(
            "fm-focus-ring w-full rounded-md border bg-slate-800/95 px-3.5 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-500",
            "border-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,box-shadow,background-color] duration-200",
            error &&
              "border-[color:var(--color-danger)] text-slate-50 shadow-[0_0_0_1px_rgba(229,72,77,0.16),inset_0_1px_0_rgba(255,255,255,0.03)]",
            className,
          )}
          id={inputId}
          {...props}
        />
        {error ? (
          <p
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-danger)]"
            id={errorId}
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
