import * as React from "react";

type Feature = {
  id: string;
  title: string;
  body: string;
  span?: "1" | "2";
  illustration: React.ReactNode;
};

const FEATURES: Feature[] = [
  {
    id: "ai",
    title: "AI-ranked matching",
    body: "Hybrid scoring: capacity fit, price, ETA, trust history. Recommendations refresh as bids land.",
    span: "2",
    illustration: <AiIllustration />,
  },
  {
    id: "bidding",
    title: "Real-time bidding",
    body: "Live offers, optimistic accept, sibling lock-out. No spreadsheets, no phone tag.",
    illustration: <BiddingIllustration />,
  },
  {
    id: "trust",
    title: "Trust scores",
    body: "Reviews + on-time deliveries collapse into a single number you can sort by.",
    illustration: <TrustIllustration />,
  },
  {
    id: "eta",
    title: "ETA prediction",
    body: "Per-corridor lookups against historical lane data. Quote in seconds.",
    illustration: <EtaIllustration />,
  },
  {
    id: "chat",
    title: "Built-in chatbot",
    body: "Ask 'show me posted loads in Berlin'. It just works.",
    illustration: <ChatIllustration />,
  },
  {
    id: "api",
    title: "API-first",
    body: "Every screen is a thin client over the same REST surface your TMS can call.",
    span: "2",
    illustration: <ApiIllustration />,
  },
];

export function FeatureGrid() {
  return (
    <section className="relative border-b border-slate-800/80 bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:px-10 sm:py-32">
        <Header eyebrow="// Capabilities" title="Built for ops, not slide decks" />
        <div className="mt-12 grid auto-rows-[minmax(220px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <article
              key={f.id}
              className={`group fm-panel-muted relative flex flex-col justify-between overflow-hidden rounded-lg p-6 transition-colors duration-300 hover:border-amber-400/40 ${
                f.span === "2" ? "lg:col-span-2" : ""
              }`}
            >
              <div className="relative h-24">{f.illustration}</div>
              <div className="space-y-2 pt-6">
                <h3 className="font-mono text-xs tracking-[0.28em] text-amber-300 uppercase">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400">{f.body}</p>
              </div>
              <span
                aria-hidden="true"
                className="absolute top-3 right-4 font-mono text-[10px] tracking-[0.32em] text-slate-700 uppercase"
              >
                {f.id.toUpperCase()}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Header({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col gap-3 sm:max-w-2xl">
      <span className="font-mono text-[11px] tracking-[0.32em] text-amber-400 uppercase">
        {eyebrow}
      </span>
      <h2
        className="font-display text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl"
        style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}
      >
        {title}
      </h2>
    </div>
  );
}

function AiIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 320 100"
    >
      <g className="opacity-80">
        {[...Array(10)].map((_, i) => (
          <line
            key={i}
            stroke="#f5b342"
            strokeOpacity={0.18 + (i % 3) * 0.16}
            strokeWidth={1}
            x1={20 + i * 28}
            x2={20 + i * 28}
            y1={20 + (i % 4) * 8}
            y2={80 - (i % 5) * 6}
          >
            <animate
              attributeName="y2"
              dur={`${2 + (i % 3)}s`}
              repeatCount="indefinite"
              values={`${80 - (i % 5) * 6};${50 - (i % 4) * 4};${80 - (i % 5) * 6}`}
            />
          </line>
        ))}
      </g>
      <text
        fill="#475569"
        fontFamily="var(--font-mono)"
        fontSize={9}
        letterSpacing={1.4}
        x={20}
        y={94}
      >
        score · price · eta · trust
      </text>
    </svg>
  );
}

function BiddingIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 200 100"
    >
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect
            fill="#1c2430"
            height={14}
            rx={3}
            stroke="#2a3441"
            width={140}
            x={20}
            y={18 + i * 22}
          />
          <rect
            fill={i === 0 ? "#f5b342" : "#4fa3e3"}
            height={14}
            opacity={0.3 - i * 0.08}
            rx={3}
            width={120 - i * 25}
            x={20}
            y={18 + i * 22}
          >
            <animate
              attributeName="width"
              dur="3s"
              repeatCount="indefinite"
              values={`${120 - i * 25};${130 - i * 30};${120 - i * 25}`}
            />
          </rect>
          <text fill="#cbd5e1" fontFamily="var(--font-mono)" fontSize={8} x={26} y={28 + i * 22}>
            €{(2400 - i * 180).toLocaleString()}
          </text>
        </g>
      ))}
    </svg>
  );
}

function TrustIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 200 100"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <polygon
          key={i}
          fill={i < 4 ? "#f5b342" : "#2a3441"}
          points="0,-12 3.5,-3.5 12,-3.5 5,2.5 7.5,11 0,5 -7.5,11 -5,2.5 -12,-3.5 -3.5,-3.5"
          transform={`translate(${30 + i * 32}, 50)`}
        />
      ))}
      <text
        fill="#94a3b8"
        fontFamily="var(--font-mono)"
        fontSize={11}
        letterSpacing={1.5}
        x={30}
        y={88}
      >
        4.0 / 5.0
      </text>
    </svg>
  );
}

function EtaIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 200 100"
    >
      <circle cx={100} cy={50} fill="none" r={34} stroke="#2a3441" strokeWidth={2} />
      <circle
        cx={100}
        cy={50}
        fill="none"
        r={34}
        stroke="#f5b342"
        strokeDasharray="160 213"
        strokeLinecap="round"
        strokeWidth={2}
        transform="rotate(-90 100 50)"
      >
        <animate
          attributeName="stroke-dasharray"
          dur="3s"
          repeatCount="indefinite"
          values="40 213; 160 213; 40 213"
        />
      </circle>
      <text
        fill="#f5b342"
        fontFamily="var(--font-mono)"
        fontSize={14}
        textAnchor="middle"
        x={100}
        y={48}
      >
        14h
      </text>
      <text
        fill="#64748b"
        fontFamily="var(--font-mono)"
        fontSize={8}
        letterSpacing={1.3}
        textAnchor="middle"
        x={100}
        y={62}
      >
        ETA
      </text>
    </svg>
  );
}

function ChatIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 200 100"
    >
      <rect fill="#1c2430" height={20} rx={4} stroke="#2a3441" width={130} x={20} y={20} />
      <text fill="#cbd5e1" fontFamily="var(--font-mono)" fontSize={9} x={28} y={33}>
        loads near berlin
      </text>
      <rect
        fill="#f5b342"
        fillOpacity={0.14}
        height={20}
        rx={4}
        stroke="#f5b342"
        strokeOpacity={0.5}
        width={150}
        x={30}
        y={56}
      />
      <text fill="#f5b342" fontFamily="var(--font-mono)" fontSize={9} x={38} y={69}>
        7 active · sorted by score
      </text>
      <circle cx={184} cy={66} fill="#f5b342" r={2}>
        <animate attributeName="opacity" dur="1.2s" repeatCount="indefinite" values="0.3;1;0.3" />
      </circle>
    </svg>
  );
}

function ApiIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 320 100"
    >
      <g fontFamily="var(--font-mono)" fontSize={10}>
        <text fill="#3dd68c" x={20} y={26}>
          POST
        </text>
        <text fill="#cbd5e1" x={60} y={26}>
          /api/loads
        </text>
        <text fill="#475569" x={170} y={26}>
          → 201 created
        </text>

        <text fill="#4fa3e3" x={20} y={50}>
          GET
        </text>
        <text fill="#cbd5e1" x={60} y={50}>
          /api/match/:id
        </text>
        <text fill="#475569" x={170} y={50}>
          → 200 ranked[]
        </text>

        <text fill="#f5b342" x={20} y={74}>
          POST
        </text>
        <text fill="#cbd5e1" x={60} y={74}>
          /api/bids/:id
        </text>
        <text fill="#475569" x={170} y={74}>
          → 200 accepted
        </text>
      </g>
    </svg>
  );
}
