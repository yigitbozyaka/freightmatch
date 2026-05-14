import Link from "next/link";

const ASCII = `
   ██╗  ██╗ ██████╗ ██╗  ██╗
   ██║  ██║██╔═████╗██║  ██║
   ███████║██║██╔██║███████║
   ╚════██║████╔╝██║╚════██║
        ██║╚██████╔╝     ██║
        ╚═╝ ╚═════╝      ╚═╝
`;

export default function NotFound() {
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center px-6 text-center"
      id="main"
      tabIndex={-1}
    >
      <p className="font-mono text-[11px] tracking-[0.32em] text-amber-400 uppercase">
        Signal lost
      </p>
      <pre
        aria-hidden="true"
        className="mt-4 font-mono text-[10px] leading-tight whitespace-pre text-amber-400/80 sm:text-xs"
      >
        {ASCII}
      </pre>
      <h1 className="sr-only">Page not found</h1>
      <p className="mt-3 max-w-sm font-mono text-xs tracking-[0.18em] text-slate-400 uppercase">
        No matching route on the freight grid.
      </p>
      <Link
        className="fm-focus-ring mt-8 inline-flex items-center gap-2 rounded-md border border-amber-400 bg-amber-400 px-4 py-2.5 font-mono text-[11px] font-semibold tracking-[0.24em] text-slate-950 uppercase shadow-[0_0_24px_rgba(245,179,66,0.18)] transition-colors hover:border-amber-500 hover:bg-amber-500"
        href="/dashboard"
      >
        Return to dashboard
      </Link>
    </main>
  );
}
