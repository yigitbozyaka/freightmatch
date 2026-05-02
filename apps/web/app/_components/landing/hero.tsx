"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/primitives/button";
import { Grain } from "./grain";

type City = { id: string; name: string; x: number; y: number };

const CITIES: City[] = [
  { id: "lon", name: "LON", x: 220, y: 220 },
  { id: "ams", name: "AMS", x: 360, y: 230 },
  { id: "par", name: "PAR", x: 320, y: 300 },
  { id: "cph", name: "CPH", x: 540, y: 150 },
  { id: "ber", name: "BER", x: 540, y: 240 },
  { id: "war", name: "WAR", x: 700, y: 240 },
  { id: "vie", name: "VIE", x: 580, y: 320 },
  { id: "mil", name: "MIL", x: 470, y: 380 },
  { id: "rom", name: "ROM", x: 540, y: 460 },
  { id: "bcn", name: "BCN", x: 320, y: 430 },
  { id: "mad", name: "MAD", x: 220, y: 460 },
  { id: "ist", name: "IST", x: 860, y: 420 },
];

const CORRIDORS: Array<[string, string, number]> = [
  ["mad", "par", 0],
  ["par", "ams", 0.4],
  ["ams", "ber", 0.7],
  ["ber", "war", 1.1],
  ["par", "mil", 0.3],
  ["mil", "rom", 0.9],
  ["bcn", "mil", 0.6],
  ["lon", "ams", 0.5],
  ["cph", "ber", 0.8],
  ["ber", "vie", 1.0],
  ["vie", "ist", 1.4],
  ["mad", "bcn", 0.2],
];

function cityById(id: string): City {
  const c = CITIES.find((c) => c.id === id);
  if (!c) throw new Error(`Unknown city ${id}`);
  return c;
}

export function Hero() {
  const counterRef = React.useRef<HTMLDivElement | null>(null);
  const [counters, setCounters] = React.useState({ loads: 0, corridors: 0, bids: 0 });
  const [started, setStarted] = React.useState(false);

  React.useEffect(() => {
    if (!counterRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const target = { loads: 128, corridors: 14, bids: 2341 };

    if (reduce) {
      setCounters(target);
      setStarted(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started) {
            setStarted(true);
            const start = performance.now();
            const dur = 1400;
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / dur);
              const eased = 1 - Math.pow(1 - t, 3);
              setCounters({
                loads: Math.round(target.loads * eased),
                corridors: Math.round(target.corridors * eased),
                bids: Math.round(target.bids * eased),
              });
              if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(counterRef.current);
    return () => obs.disconnect();
  }, [started]);

  return (
    <section className="relative isolate overflow-hidden border-b border-slate-800/80">
      <Grain opacity={0.08} />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_60%_30%,rgba(245,179,66,0.08),transparent_55%),radial-gradient(circle_at_20%_80%,rgba(79,163,227,0.06),transparent_50%)]" />

      <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col px-6 pt-24 pb-16 sm:px-10">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] tracking-[0.32em] text-amber-400 uppercase">
            {"// FM-OPS v0.1"}
          </span>
          <nav className="flex items-center gap-3 font-mono text-[11px] tracking-[0.28em] uppercase">
            <Link className="text-slate-400 transition-colors hover:text-slate-100" href="/login">
              Sign&nbsp;In
            </Link>
            <Link
              className="rounded-md border border-amber-400/60 bg-amber-400/10 px-3 py-1.5 text-amber-300 transition-colors hover:border-amber-400 hover:bg-amber-400/20"
              href="/register"
            >
              Create&nbsp;Account
            </Link>
          </nav>
        </div>

        <div className="relative grid flex-1 grid-cols-1 items-center gap-10 pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:pt-16">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-sm border border-amber-400/30 bg-amber-400/5 px-2.5 py-1 font-mono text-[10px] tracking-[0.28em] text-amber-300 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,179,66,0.8)]" />
              Live · 14 corridors monitored
            </span>
            <h1
              className="font-display text-[clamp(2.4rem,6vw,4.4rem)] font-black leading-[0.94] tracking-[-0.02em] text-slate-100"
              style={{ fontFamily: "var(--font-display)", fontWeight: 900 }}
            >
              FREIGHT<span className="text-amber-400">MATCH</span>
              <span className="block text-slate-500">{"// OPS CONSOLE"}</span>
              <span className="block text-slate-300">FOR FREIGHT</span>
            </h1>
            <p className="max-w-md text-base leading-relaxed text-slate-400">
              AI-ranked carriers, live bidding, and trust scoring — purpose-built for the shippers
              and fleets that actually move Europe.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" variant="primary">
                <Link href="/register">Create&nbsp;Account</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/login">Sign&nbsp;In</Link>
              </Button>
            </div>
            <div
              ref={counterRef}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-3 font-mono text-[11px] tracking-[0.18em] text-slate-400 uppercase"
              aria-live="polite"
            >
              <span className="text-amber-300">{counters.loads.toLocaleString()}</span>
              <span>loads in motion</span>
              <span className="text-slate-700">·</span>
              <span className="text-amber-300">{counters.corridors}</span>
              <span>corridors</span>
              <span className="text-slate-700">·</span>
              <span className="text-amber-300">{counters.bids.toLocaleString()}</span>
              <span>bids today</span>
            </div>
          </div>

          <CorridorMap />
        </div>
      </div>
    </section>
  );
}

function CorridorMap() {
  const pathRefs = React.useRef<(SVGPathElement | null)[]>([]);

  React.useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    pathRefs.current.forEach((path, i) => {
      if (!path) return;
      const len = path.getTotalLength();
      path.style.setProperty("--len", String(len));
      if (reduce) {
        path.style.strokeDasharray = "none";
        path.style.strokeDashoffset = "0";
      } else {
        path.style.strokeDasharray = `${len}`;
        path.style.strokeDashoffset = `${len}`;
        path.style.animation = `fm-corridor-draw 1.6s cubic-bezier(.22,.61,.36,1) ${
          0.2 + i * 0.08
        }s forwards`;
      }
    });
  }, []);

  return (
    <div className="relative">
      <div className="relative aspect-[5/3] w-full overflow-hidden rounded-lg border border-slate-800/90 bg-slate-950/60 p-0">
        <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(245,179,66,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(245,179,66,0.05)_1px,transparent_1px)] [background-size:32px_32px]" />
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          fill="none"
          preserveAspectRatio="xMidYMid meet"
          viewBox="0 0 1000 600"
        >
          <defs>
            <linearGradient id="corridor-grad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#f5b342" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#f5b342" stopOpacity="1" />
              <stop offset="100%" stopColor="#4fa3e3" stopOpacity="0.4" />
            </linearGradient>
            <radialGradient id="city-glow">
              <stop offset="0%" stopColor="#f5b342" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f5b342" stopOpacity="0" />
            </radialGradient>
          </defs>

          {CORRIDORS.map(([from, to], i) => {
            const a = cityById(from);
            const b = cityById(to);
            const mx = (a.x + b.x) / 2;
            const my = Math.min(a.y, b.y) - 30;
            const d = `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
            return (
              <path
                key={`${from}-${to}`}
                ref={(el) => {
                  pathRefs.current[i] = el;
                }}
                d={d}
                stroke="url(#corridor-grad)"
                strokeLinecap="round"
                strokeWidth={1.5}
              />
            );
          })}

          {CITIES.map((city) => (
            <g key={city.id}>
              <circle cx={city.x} cy={city.y} fill="url(#city-glow)" r={18} />
              <circle
                cx={city.x}
                cy={city.y}
                fill="#0a0e12"
                r={4}
                stroke="#f5b342"
                strokeWidth={1.4}
              />
              <text
                fill="#94a3b8"
                fontFamily="var(--font-mono)"
                fontSize={10}
                letterSpacing={1.2}
                x={city.x + 8}
                y={city.y - 8}
              >
                {city.name}
              </text>
            </g>
          ))}

          {CORRIDORS.slice(0, 6).map(([from, to], i) => {
            const a = cityById(from);
            const b = cityById(to);
            const mx = (a.x + b.x) / 2;
            const my = Math.min(a.y, b.y) - 30;
            const d = `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
            return (
              <circle
                key={`pulse-${from}-${to}`}
                fill="#f5b342"
                r={2.5}
                style={{
                  filter: "drop-shadow(0 0 6px rgba(245,179,66,0.9))",
                  offsetPath: `path('${d}')`,
                  offsetDistance: "0%",
                  animation: `fm-corridor-pulse 4.5s linear ${i * 0.7}s infinite`,
                }}
              />
            );
          })}
        </svg>

        <div className="absolute right-3 bottom-3 flex items-center gap-3 rounded border border-slate-800/80 bg-slate-950/80 px-2.5 py-1.5 font-mono text-[9px] tracking-[0.22em] text-slate-400 uppercase backdrop-blur-sm">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-[2px] w-3 rounded bg-amber-400" />
            Active
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
            Hub
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes fm-corridor-draw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes fm-corridor-pulse {
          from {
            offset-distance: 0%;
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          to {
            offset-distance: 100%;
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(circle[style*="offset-path"]) {
            animation: none !important;
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
