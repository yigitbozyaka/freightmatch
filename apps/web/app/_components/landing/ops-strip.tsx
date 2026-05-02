type Mock = {
  caption: string;
  surface: "dashboard" | "bids" | "map";
};

const MOCKS: Mock[] = [
  { caption: "OPS-01 · Shipper command center", surface: "dashboard" },
  { caption: "OPS-02 · Bid inbox · Berlin → Warsaw", surface: "bids" },
  { caption: "OPS-03 · Active corridors · live", surface: "map" },
];

export function OpsStrip() {
  return (
    <section className="relative border-b border-slate-800/80">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:px-10 sm:py-32">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3 sm:max-w-2xl">
            <span className="font-mono text-[11px] tracking-[0.32em] text-amber-400 uppercase">
              {"// Console snapshots"}
            </span>
            <h2
              className="font-display text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl"
              style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}
            >
              The actual screens, not stock photos
            </h2>
          </div>
          <span className="font-mono text-[10px] tracking-[0.28em] text-slate-500 uppercase">
            scroll →
          </span>
        </div>

        <div className="mt-12 -mx-6 overflow-x-auto pb-4 sm:-mx-10">
          <div className="flex w-max gap-6 px-6 sm:px-10">
            {MOCKS.map((m) => (
              <figure
                key={m.caption}
                className="fm-panel-muted relative w-[440px] shrink-0 overflow-hidden rounded-lg p-4 sm:w-[520px]"
              >
                <div className="aspect-[16/10] overflow-hidden rounded-md border border-slate-800/80 bg-slate-950">
                  {m.surface === "dashboard" ? <DashboardMock /> : null}
                  {m.surface === "bids" ? <BidsMock /> : null}
                  {m.surface === "map" ? <MapMock /> : null}
                </div>
                <figcaption className="mt-3 flex items-center justify-between font-mono text-[10px] tracking-[0.24em] text-slate-400 uppercase">
                  <span>{m.caption}</span>
                  <span className="text-slate-700">●●●</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MockChrome({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-800/80 bg-slate-900/60 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-slate-700" />
        <span className="h-2 w-2 rounded-full bg-slate-700" />
        <span className="h-2 w-2 rounded-full bg-slate-700" />
        <span className="ml-2 font-mono text-[9px] tracking-[0.3em] text-slate-500 uppercase">
          {label}
        </span>
      </div>
      <div className="flex-1 overflow-hidden p-3">{children}</div>
    </div>
  );
}

function DashboardMock() {
  return (
    <MockChrome label="freightmatch.app/shipper/dashboard">
      <div className="grid h-full grid-cols-3 gap-2">
        {["LOADS", "BIDS", "DELIVERED"].map((k, i) => (
          <div key={k} className="rounded border border-slate-800 bg-slate-900/60 p-2">
            <div className="font-mono text-[8px] tracking-widest text-slate-500 uppercase">{k}</div>
            <div className="mt-1 font-mono text-lg font-bold text-amber-300">
              {[42, 128, 11][i]}
            </div>
            <div className="mt-1 h-1 rounded bg-slate-800">
              <div
                className="h-full rounded bg-amber-400/70"
                style={{ width: `${[60, 82, 35][i]}%` }}
              />
            </div>
          </div>
        ))}
        <div className="col-span-3 rounded border border-slate-800 bg-slate-900/60 p-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] tracking-widest text-slate-500 uppercase">
              Recent activity
            </span>
            <span className="font-mono text-[9px] text-amber-400">live</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {[
              ["BER → WAR", "matched", "#3dd68c"],
              ["MAD → PAR", "posted", "#f5b342"],
              ["AMS → ROM", "in transit", "#4fa3e3"],
            ].map(([row, status, color]) => (
              <div
                key={row}
                className="flex items-center justify-between font-mono text-[9px] text-slate-400"
              >
                <span>{row}</span>
                <span style={{ color }}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockChrome>
  );
}

function BidsMock() {
  return (
    <MockChrome label="freightmatch.app/shipper/loads/L-2814">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-widest text-slate-300 uppercase">
            BER → WAR · 18t · refrig.
          </span>
          <span className="rounded border border-amber-400/60 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[8px] tracking-widest text-amber-300 uppercase">
            Posted
          </span>
        </div>
        {[
          { name: "Volkov Trans", price: "€2,420", score: 94 },
          { name: "Adler Logistik", price: "€2,580", score: 88 },
          { name: "Nord Cargo", price: "€2,610", score: 81 },
        ].map((b) => (
          <div
            key={b.name}
            className="flex items-center gap-3 rounded border border-slate-800 bg-slate-900/60 p-2"
          >
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600" />
            <div className="flex-1">
              <div className="font-mono text-[10px] text-slate-200">{b.name}</div>
              <div className="mt-1 h-1 w-24 rounded bg-slate-800">
                <div className="h-full rounded bg-amber-400" style={{ width: `${b.score}%` }} />
              </div>
            </div>
            <span className="font-mono text-[10px] text-amber-300">{b.price}</span>
          </div>
        ))}
      </div>
    </MockChrome>
  );
}

function MapMock() {
  return (
    <MockChrome label="freightmatch.app/shipper/dashboard · map">
      <div className="relative h-full overflow-hidden rounded bg-slate-950">
        <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(245,179,66,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(245,179,66,0.05)_1px,transparent_1px)] [background-size:18px_18px]" />
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          fill="none"
          viewBox="0 0 400 220"
        >
          <path
            d="M 40 160 Q 140 60 220 100 T 360 60"
            stroke="#f5b342"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
          <path
            d="M 60 60 Q 180 100 300 180"
            stroke="#4fa3e3"
            strokeOpacity={0.7}
            strokeWidth={1.5}
          />
          {[
            [40, 160],
            [220, 100],
            [360, 60],
            [60, 60],
            [300, 180],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} fill="#0a0e12" r={3} stroke="#f5b342" strokeWidth={1.2} />
          ))}
        </svg>
      </div>
    </MockChrome>
  );
}
