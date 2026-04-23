import { PrimitivesShowcase } from '@/components/primitives/_showcase';
export default function KitchenPage() {
  return (
    <main className="min-h-dvh px-8 py-12 space-y-16">
      <header className="space-y-1">
        <p className="font-mono text-xs tracking-widest text-amber-400 uppercase">
          /_kitchen
        </p>
        <h1
          className="text-3xl font-bold tracking-tight text-slate-100"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Design System Kitchen Sink
        </h1>
        <p className="text-sm text-slate-400">
          Placeholder sections — components land here as DS1 / DS2 / DS3 are implemented.
        </p>
      </header>

      <Section title="Color Tokens">
        <div className="flex flex-wrap gap-3">
          {[
            { label: "slate-950", cls: "bg-slate-950", border: true },
            { label: "slate-900", cls: "bg-slate-900", border: true },
            { label: "slate-800", cls: "bg-slate-800" },
            { label: "slate-700", cls: "bg-slate-700" },
            { label: "amber-400", cls: "bg-amber-400" },
            { label: "amber-500", cls: "bg-amber-500" },
            { label: "danger", cls: "bg-[--color-danger]" },
            { label: "go", cls: "bg-[--color-go]" },
            { label: "transit", cls: "bg-[--color-transit]" },
          ].map(({ label, cls, border }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div
                className={`h-10 w-20 rounded ${cls} ${border ? "border border-slate-700" : ""}`}
              />
              <span className="font-mono text-xs text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-3">
          <p className="font-mono text-xs text-amber-400 uppercase tracking-widest">
            JetBrains Mono — display / mono
          </p>
          <p
            className="text-4xl font-bold text-slate-100 tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            AaBbCc 0123456789
          </p>
          <p className="text-sm text-slate-300" style={{ fontFamily: "var(--font-sans)" }}>
            Geist body — The quick brown fox jumps over the lazy dog.
          </p>
          <p className="font-mono text-sm text-slate-400">
            Mono — load #FM-00421 · 42,000 lb · $3,840
          </p>
        </div>
      </Section>

      <Section title="DS1 — Button, Input, Select, Dialog, Drawer, Tabs">
        <Placeholder label="Components land here in issue #46" />
      </Section>

      <Section title="DS2 — Table, StatusPill, KpiTile, MonoNum, SectionHeader, Toast">
        <PrimitivesShowcase />
      </Section>

      <Section title="DS3 — RouteMap">
        <Placeholder label="Component lands here in issue #48" />
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-mono text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex h-20 items-center justify-center rounded border border-dashed border-slate-700">
      <span className="font-mono text-xs text-slate-600">{label}</span>
    </div>
  );
}