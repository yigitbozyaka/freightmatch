import { GridBackdrop } from "@/components/GridBackdrop";

interface AuthShellProps {
  subtitle: string;
  children: React.ReactNode;
}

export function AuthShell({ subtitle, children }: AuthShellProps) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6 py-10">
      <GridBackdrop />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,179,66,0.08),transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_0.5px,transparent_0.5px)] [background-size:3px_3px]"
      />
      <section className="relative z-10 w-full max-w-md rounded-xl border border-slate-800 bg-slate-950/90 p-7 shadow-[0_0_80px_rgba(0,0,0,0.45)]">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-amber-400">FreightMatch</p>
        <h1 className="mt-2 font-display text-3xl font-black text-slate-100">
          FREIGHTMATCH // OPS
        </h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-wider text-slate-400">{subtitle}</p>
        {children}
      </section>
    </main>
  );
}
