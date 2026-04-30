import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/ui/cn";

type AuthShellProps = {
  children: React.ReactNode;
  eyebrow: string;
  heading: string;
  subheading: string;
  footerHref: string;
  footerLabel: string;
  footerText: string;
};

export function AuthShell({
  children,
  eyebrow,
  heading,
  subheading,
  footerHref,
  footerLabel,
  footerText,
}: AuthShellProps) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.07] mix-blend-screen"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(226,232,240,0.9) 1px, transparent 0)",
          backgroundSize: "4px 4px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-amber-400/30"
      />
      <section
        className={cn(
          "fm-panel-surface w-full max-w-[30rem] rounded-lg p-5 sm:p-6",
          "after:pointer-events-none after:absolute after:inset-x-6 after:top-0 after:h-px after:bg-amber-400/40",
        )}
      >
        <div className="relative space-y-6">
          <header className="space-y-3">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-400">
              {eyebrow}
            </p>
            <div className="space-y-2">
              <h1
                className="text-2xl font-bold uppercase text-slate-100 sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                FREIGHTMATCH // OPS
              </h1>
              <p className="text-sm leading-6 text-slate-400">{subheading}</p>
            </div>
            <h2 className="sr-only">{heading}</h2>
          </header>

          {children}

          <p className="flex flex-col items-center gap-2 border-t border-slate-700/70 pt-4 text-center text-sm text-slate-500">
            <span>{footerText}</span>
            <Link
              className="fm-focus-ring rounded-sm font-mono text-xs font-semibold uppercase tracking-[0.18em] text-amber-400 hover:text-amber-300"
              href={footerHref}
            >
              {footerLabel}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
