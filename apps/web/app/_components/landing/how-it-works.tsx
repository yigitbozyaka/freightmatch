const STEPS: Array<{ n: string; title: string; body: string }> = [
  {
    n: "01",
    title: "Post",
    body: "Origin, destination, weight, truck type. AI normalizes the rest. Live the moment you submit.",
  },
  {
    n: "02",
    title: "Bid",
    body: "Carriers see your load instantly. Bids ranked by hybrid score. Accept the right one in one click.",
  },
  {
    n: "03",
    title: "Deliver",
    body: "Status updates, ETA tracking, proof of delivery. Trust score updates automatically.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative border-b border-slate-800/80">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:px-10 sm:py-32">
        <div className="space-y-3 sm:max-w-2xl">
          <span className="font-mono text-[11px] tracking-[0.32em] text-amber-400 uppercase">
            {"// How it works"}
          </span>
          <h2
            className="font-display text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl"
            style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}
          >
            Three steps. No middleman calls.
          </h2>
        </div>

        <ol className="mt-14 grid grid-cols-1 gap-0 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.n} className="relative flex flex-col">
              <div className="relative flex items-center gap-3 pb-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-amber-400/60 bg-amber-400/10 font-mono text-sm font-bold tracking-widest text-amber-300">
                  {step.n}
                </span>
                {i < STEPS.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="hidden h-3 flex-1 lg:block"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(135deg, rgba(245,179,66,0.55) 0 8px, rgba(10,14,18,1) 8px 16px)",
                    }}
                  />
                ) : null}
              </div>
              <div className="space-y-2 pr-6">
                <h3 className="font-mono text-sm tracking-[0.24em] text-slate-100 uppercase">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
