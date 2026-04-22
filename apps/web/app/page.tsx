export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="space-y-4 text-center">
        <p className="font-mono text-xs tracking-widest text-amber-400 uppercase">
          Industrial Ops Console
        </p>
        <h1
          className="font-display text-5xl font-bold tracking-tight text-slate-100"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Freight<span className="text-amber-400">Match</span>
        </h1>
        <p className="max-w-sm text-sm text-slate-400">
          AI-powered freight matching for shippers and carriers.
        </p>
        <div className="flex items-center justify-center gap-3 pt-4">
          <span className="h-px w-12 bg-amber-400/30" />
          <span className="font-mono text-xs text-amber-500">v0.1.0 — scaffold</span>
          <span className="h-px w-12 bg-amber-400/30" />
        </div>
      </div>
    </main>
  );
}
