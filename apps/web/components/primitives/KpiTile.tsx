import { MonoNum } from './MonoNum';

type Trend = {
  direction: 'up' | 'down';
  value: number;
};

type KpiTileProps = {
  label: string;
  value: number;
  trend?: Trend;
  currency?: string;
  unit?: string;
};

export function KpiTile({ label, value, trend, currency, unit }: KpiTileProps) {
  const trendClass = trend?.direction === 'up' ? 'text-[--color-go]' : 'text-[--color-danger]';

  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-slate-400">{label}</p>
      <div className="flex items-end justify-between gap-3">
        <MonoNum value={value} currency={currency} unit={unit} className="text-3xl font-black text-slate-100" />
        {trend ? (
          <span className={`font-mono text-xs ${trendClass}`}>
            {trend.direction === 'up' ? '▲' : '▼'}
            <MonoNum value={Math.abs(trend.value)} unit="%" className="ml-1" maximumFractionDigits={1} />
          </span>
        ) : null}
      </div>
    </article>
  );
}
