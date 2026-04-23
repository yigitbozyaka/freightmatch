import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/ui/cn";

const buttonVariants = {
  primary:
    "border border-amber-400 bg-amber-400 text-slate-950 shadow-[0_0_24px_rgba(245,179,66,0.18)] hover:border-amber-500 hover:bg-amber-500",
  secondary:
    "border border-slate-600 bg-slate-900 text-slate-100 hover:border-slate-500 hover:bg-slate-800",
  ghost:
    "border border-transparent bg-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900 hover:text-slate-100",
  danger:
    "border border-[var(--color-danger)] bg-[var(--color-danger)] text-white shadow-[0_0_20px_rgba(229,72,77,0.16)] hover:brightness-110",
} as const;

const buttonSizes = {
  sm: "h-9 px-3 text-[11px]",
  md: "h-11 px-4 text-xs",
  lg: "h-12 px-5 text-sm",
} as const;

export type ButtonProps = Omit<React.ComponentPropsWithoutRef<"button">, "children"> & {
  asChild?: boolean;
  children?: React.ReactNode;
  loading?: boolean;
  size?: keyof typeof buttonSizes;
  variant?: keyof typeof buttonVariants;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild = false,
      children,
      className,
      disabled,
      loading = false,
      size = "md",
      type,
      variant = "primary",
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        aria-busy={loading || undefined}
        className={cn(
          "fm-focus-ring relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-md font-mono font-semibold uppercase tracking-[0.24em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
          "active:translate-y-px",
          buttonVariants[variant],
          buttonSizes[size],
          className,
        )}
        disabled={!asChild ? disabled || loading : undefined}
        type={!asChild ? (type ?? "button") : undefined}
        {...props}
      >
        {loading ? (
          <>
            <span className="invisible">{children ?? "Loading"}</span>
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center font-mono text-base tracking-normal animate-spin"
            >
              ◐
            </span>
            <span className="sr-only">Loading</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);

Button.displayName = "Button";
