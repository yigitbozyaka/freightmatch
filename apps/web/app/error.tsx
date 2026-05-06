"use client";

import * as React from "react";
import Link from "next/link";

const ASCII = `
   ███████╗ ██████╗  ██████╗
   ██╔════╝██╔═████╗██╔═████╗
   ███████╗██║██╔██║██║██╔██║
   ╚════██║████╔╝██║████╔╝██║
   ███████║╚██████╔╝╚██████╔╝
   ╚══════╝ ╚═════╝  ╚═════╝
`;

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[error.tsx]", error);
    }
  }, [error]);

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center px-6 text-center"
      id="main"
      tabIndex={-1}
    >
      <p className="font-mono text-[11px] tracking-[0.32em] text-[var(--color-danger)] uppercase">
        System fault
      </p>
      <pre
        aria-hidden="true"
        className="mt-4 font-mono text-[10px] leading-tight whitespace-pre text-[var(--color-danger)]/85 sm:text-xs"
      >
        {ASCII}
      </pre>
      <h1 className="sr-only">Internal server error</h1>
      <p className="mt-3 max-w-md font-mono text-xs tracking-[0.18em] text-slate-400 uppercase">
        The console hit an unexpected condition. Telemetry has logged the trace.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[10px] tracking-[0.28em] text-slate-600 uppercase">
          trace · {error.digest}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          className="fm-focus-ring inline-flex items-center gap-2 rounded-md border border-amber-400 bg-amber-400 px-4 py-2.5 font-mono text-[11px] font-semibold tracking-[0.24em] text-slate-950 uppercase shadow-[0_0_24px_rgba(245,179,66,0.18)] transition-colors hover:border-amber-500 hover:bg-amber-500"
          onClick={reset}
          type="button"
        >
          Retry
        </button>
        <Link
          className="fm-focus-ring inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-4 py-2.5 font-mono text-[11px] font-semibold tracking-[0.24em] text-slate-200 uppercase transition-colors hover:border-slate-500 hover:bg-slate-800"
          href="/"
        >
          Return to base
        </Link>
      </div>
    </main>
  );
}
