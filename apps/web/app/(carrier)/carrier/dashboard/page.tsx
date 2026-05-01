"use client";

import * as React from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { scaleLinear, scalePoint } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { AlertTriangle, Clock3, MapPin, PackageCheck, Route, ShieldCheck } from "lucide-react";
import { RouteMap } from "@/components/maps/RouteMap";
import { KpiTile } from "@/components/primitives/KpiTile";
import { MonoNum } from "@/components/primitives/MonoNum";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { StatusPill } from "@/components/primitives/StatusPill";
import * as bidsApi from "@/lib/api/bids";
import type { Bid } from "@/lib/api/bids";
import * as loadsApi from "@/lib/api/loads";
import type { Load, LoadStatus } from "@/lib/api/loads";
import { getProfile } from "@/lib/api/users";

type PickupItem = {
  bid: Bid;
  load: Load;
};

type EarningsPoint = {
  label: string;
  value: number;
};

// Mock data: no carrier earnings endpoint exists yet, so the mini-chart is illustrative only.
const MOCK_EARNINGS: EarningsPoint[] = [
  { label: "W1", value: 4200 },
  { label: "W2", value: 5100 },
  { label: "W3", value: 4600 },
  { label: "W4", value: 5900 },
  { label: "W5", value: 6400 },
  { label: "W6", value: 7100 },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PICKUP_STATUSES = new Set<LoadStatus>(["Matched", "InTransit"]);

export default function CarrierDashboardPage() {
  const profileQuery = useQuery({
    queryKey: ["users", "profile"],
    queryFn: getProfile,
  });

  const bidsQuery = useQuery({
    queryKey: ["bids", "my"],
    queryFn: bidsApi.listMine,
  });

  const availableLoadsQuery = useQuery({
    queryKey: ["loads", "available"],
    queryFn: () => loadsApi.listAvailable(),
  });

  const bids = React.useMemo(() => bidsQuery.data ?? [], [bidsQuery.data]);
  const availableLoads = React.useMemo(
    () => availableLoadsQuery.data ?? [],
    [availableLoadsQuery.data],
  );
  const carrierProfile = profileQuery.data?.carrierProfile ?? null;

  const acceptedBidsForLookup = React.useMemo(
    () => bids.filter((bid) => bid.status === "Accepted").slice(0, 8),
    [bids],
  );

  const pickupLoadQueries = useQueries({
    queries: acceptedBidsForLookup.map((bid) => ({
      queryKey: ["carrier-dashboard", "accepted-load", bid.loadId],
      queryFn: () => loadsApi.get(bid.loadId),
      retry: false,
      staleTime: 60 * 1000,
    })),
  });

  const upcomingPickups = React.useMemo(
    () =>
      acceptedBidsForLookup
        .map((bid, index) => ({ bid, load: pickupLoadQueries[index]?.data }))
        .filter(isPickupItem)
        .slice(0, 5),
    [acceptedBidsForLookup, pickupLoadQueries],
  );

  const recommendedLoads = React.useMemo(
    () =>
      [...availableLoads]
        // Loads do not expose reusable coordinates, so this dashboard keeps the fallback newest sort.
        .sort((a, b) => getNewestTimestamp(b) - getNewestTimestamp(a))
        .slice(0, 6),
    [availableLoads],
  );

  const pendingBids = bids.filter((bid) => bid.status === "Pending").length;
  const recentBids = bids.filter((bid) => isWithinLastDays(bid.createdAt, 30));
  const recentAcceptedBids = recentBids.filter((bid) => bid.status === "Accepted").length;
  const winRate =
    recentBids.length > 0 ? Math.round((recentAcceptedBids / recentBids.length) * 100) : 0;
  const avgEtaHours = carrierProfile?.avgEtaHours ?? 0;
  const trustScore = clampScore(carrierProfile?.trustScore ?? 0);
  const profileLoaded = profileQuery.isSuccess || profileQuery.isError;
  const isProfileIncomplete =
    profileLoaded && (!carrierProfile?.truckType || !carrierProfile?.capacityKg);
  const pickupQueriesLoading = pickupLoadQueries.some((query) => query.isLoading);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Carrier</p>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1
              className="text-2xl font-bold text-slate-100 sm:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Command center for bids, lanes, and pickups.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
            <ShieldCheck className="h-4 w-4 text-[--color-go]" aria-hidden="true" />
            Live Ops
          </div>
        </div>
      </header>

      {isProfileIncomplete ? <CompleteProfileBanner /> : null}

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Open bids" value={pendingBids} />
        <KpiTile label="Win rate" value={winRate} unit="%" />
        <KpiTile label="Avg ETA" value={avgEtaHours} maximumFractionDigits={1} unit="h" />
        <TrustScoreTile value={trustScore} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <EarningsPanel />
        <UpcomingPickupsPanel
          hasAcceptedBids={acceptedBidsForLookup.length > 0}
          isLoading={pickupQueriesLoading}
          pickups={upcomingPickups}
        />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader label="Loads for you" />
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Newest posted lanes
          </p>
        </div>

        {recommendedLoads.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommendedLoads.map((load) => (
              <LoadRecommendationCard key={load._id} load={load} />
            ))}
          </div>
        ) : (
          <EmptyState
            label={
              availableLoadsQuery.isError
                ? "Available loads unavailable"
                : availableLoadsQuery.isLoading
                  ? "Loading available lanes"
                  : "No posted loads right now"
            }
          />
        )}
      </section>
    </div>
  );
}

function CompleteProfileBanner() {
  return (
    <section className="mt-6 rounded-lg border border-amber-400/70 bg-amber-400/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-amber-400/50 bg-slate-950/50 text-amber-400">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
            Complete your profile
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Add truck type and capacity to keep carrier matching ready.
          </p>
        </div>
      </div>
    </section>
  );
}

function TrustScoreTile({ value }: { value: number }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-slate-400">
        Trust score
      </p>
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="font-mono text-3xl font-black tabular-nums tracking-[0.02em] text-slate-100">
            {value}
          </span>
          <span className="ml-1 font-mono text-lg text-slate-500">/100</span>
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-amber-400"
          style={{ width: `${value}%` }}
          aria-hidden="true"
        />
      </div>
    </article>
  );
}

function EarningsPanel() {
  const total = MOCK_EARNINGS.reduce((sum, point) => sum + point.value, 0);

  return (
    <section className="fm-panel-muted rounded-lg p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionHeader label="Earnings" />
          <p className="mt-3 font-mono text-3xl font-black tabular-nums text-slate-100">
            <MonoNum value={total} currency="USD" />
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-[2px] bg-amber-400" />
            Net revenue
          </span>
          <span>6wk</span>
        </div>
      </div>
      <EarningsMiniChart data={MOCK_EARNINGS} />
    </section>
  );
}

function EarningsMiniChart({ data }: { data: EarningsPoint[] }) {
  const chartWidth = 640;
  const chartHeight = 178;
  const xScale = scalePoint<string>({
    domain: data.map((point) => point.label),
    padding: 0.35,
    range: [18, chartWidth - 18],
  });
  const yScale = scaleLinear<number>({
    domain: [0, Math.max(...data.map((point) => point.value)) * 1.12],
    nice: true,
    range: [chartHeight - 26, 16],
  });

  return (
    <div className="mt-5 h-[178px] w-full overflow-hidden">
      <svg
        aria-label="Earnings trend"
        className="h-full w-full"
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      >
        <defs>
          <linearGradient id="earningsLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#F5B342" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#3DD68C" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((tick) => (
          <line
            key={tick}
            stroke="rgba(148, 163, 184, 0.12)"
            strokeDasharray="4 8"
            strokeWidth="1"
            x1="0"
            x2={chartWidth}
            y1={chartHeight * tick}
            y2={chartHeight * tick}
          />
        ))}
        <LinePath<EarningsPoint>
          curve={undefined}
          data={data}
          stroke="url(#earningsLine)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          x={(point) => xScale(point.label) ?? 0}
          y={(point) => yScale(point.value)}
        />
        {data.map((point) => {
          const x = xScale(point.label) ?? 0;
          const y = yScale(point.value);
          return (
            <g key={point.label}>
              <circle cx={x} cy={y} fill="#0A0E12" r="5.5" stroke="#F5B342" strokeWidth="2" />
              <text
                fill="#64748B"
                fontFamily="var(--font-mono)"
                fontSize="10"
                textAnchor="middle"
                x={x}
                y={chartHeight - 5}
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function UpcomingPickupsPanel({
  hasAcceptedBids,
  isLoading,
  pickups,
}: {
  hasAcceptedBids: boolean;
  isLoading: boolean;
  pickups: PickupItem[];
}) {
  return (
    <section className="fm-panel-muted rounded-lg p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <SectionHeader label="Upcoming pickups" />
        <Route className="h-4 w-4 text-amber-400" aria-hidden="true" />
      </div>

      {pickups.length > 0 ? (
        <div className="space-y-4">
          {pickups.map((item) => (
            <PickupTimelineItem key={item.bid._id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          label={
            isLoading
              ? "Syncing accepted lanes"
              : hasAcceptedBids
                ? "No matched pickups yet"
                : "No accepted bids yet"
          }
        />
      )}
    </section>
  );
}

function PickupTimelineItem({ item }: { item: PickupItem }) {
  return (
    <article className="grid grid-cols-[18px_1fr] gap-3">
      <div className="relative flex justify-center">
        <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_18px_rgba(245,179,66,0.34)]" />
        <span className="absolute top-5 h-[calc(100%+0.5rem)] w-px bg-slate-800" />
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-950/45 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-100">{item.load.title}</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
              Bid <MonoNum value={item.bid.priceUSD} currency="USD" />
            </p>
          </div>
          <StatusPill status={item.load.status} />
        </div>
        <div className="mt-3 space-y-2 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-400">
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
            <span className="min-w-0 truncate">
              {item.load.origin} to {item.load.destination}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Clock3 className="h-3.5 w-3.5 text-[--color-transit]" aria-hidden="true" />
            <span>{item.bid.estimatedDeliveryHours}h ETA</span>
          </p>
        </div>
      </div>
    </article>
  );
}

function LoadRecommendationCard({ load }: { load: Load }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
      <RouteMap destination={load.destination} height="138px" interactive origin={load.origin} />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">{load.title}</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
            {load.cargoType}
          </p>
        </div>
        <StatusPill status={load.status} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-400">
        <p className="flex min-w-0 items-center gap-2">
          <PackageCheck className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
          <span className="truncate">
            <MonoNum value={load.weightKg} /> kg
          </span>
        </p>
        <p className="flex min-w-0 items-center justify-end gap-2 text-right">
          <Clock3 className="h-3.5 w-3.5 shrink-0 text-[--color-transit]" aria-hidden="true" />
          <span className="truncate">{load.deadlineHours}h</span>
        </p>
      </div>
    </article>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/35 px-4 py-8 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
    </div>
  );
}

function isPickupItem(item: { bid: Bid; load?: Load }): item is PickupItem {
  return Boolean(item.load && PICKUP_STATUSES.has(item.load.status));
}

function isWithinLastDays(value: string | undefined, days: number) {
  const timestamp = getTimestamp(value);
  return timestamp > 0 && Date.now() - timestamp <= days * MS_PER_DAY;
}

function getNewestTimestamp(load: Load) {
  return getTimestamp(load.createdAt ?? load.updatedAt);
}

function getTimestamp(value: string | undefined) {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}
