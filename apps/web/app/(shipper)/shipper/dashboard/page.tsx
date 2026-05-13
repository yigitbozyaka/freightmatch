"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Gavel, PackagePlus, Truck, XCircle } from "lucide-react";
import { ActiveRoutesMap, type ActiveRoute } from "@/components/maps/ActiveRoutesMap";
import { KpiTile } from "@/components/primitives/KpiTile";
import { MonoNum } from "@/components/primitives/MonoNum";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { StatusPill } from "@/components/primitives/StatusPill";
import { Table } from "@/components/primitives/Table";
import * as bidsApi from "@/lib/api/bids";
import type { Bid } from "@/lib/api/bids";
import * as loadsApi from "@/lib/api/loads";
import type { Load, LoadStatus } from "@/lib/api/loads";
import { getProfile } from "@/lib/api/users";

const ACTIVE_STATUSES: LoadStatus[] = ["Posted", "Matched", "InTransit"];
const ACTIVE_SET = new Set<LoadStatus>(ACTIVE_STATUSES);

type ActivityEvent = {
  id: string;
  timestamp: number;
  kind: "status" | "bid";
  description: string;
  loadTitle: string;
  status?: LoadStatus;
  bidStatus?: Bid["status"];
};

type LoadRow = {
  _id: string;
  title: string;
  origin: string;
  destination: string;
  status: LoadStatus;
  weightKg: number;
  bidCount: number;
  updatedAt: string;
  [key: string]: unknown;
};

export default function ShipperDashboardPage() {
  const router = useRouter();

  const profileQuery = useQuery({
    queryKey: ["users", "profile"],
    queryFn: getProfile,
  });

  const loadsQuery = useQuery({
    queryKey: ["loads", "my"],
    queryFn: loadsApi.list,
  });

  const loads = React.useMemo(() => loadsQuery.data ?? [], [loadsQuery.data]);
  const activeLoads = React.useMemo(
    () => loads.filter((load) => ACTIVE_SET.has(load.status)),
    [loads],
  );

  const bidQueries = useQueries({
    queries: activeLoads.map((load) => ({
      queryKey: ["bids", "for-load", load._id],
      queryFn: () => bidsApi.listForLoad(load._id),
      retry: false,
      staleTime: 30 * 1000,
    })),
  });

  const bidsByLoad = React.useMemo(() => {
    const map = new Map<string, Bid[]>();
    activeLoads.forEach((load, index) => {
      map.set(load._id, bidQueries[index]?.data ?? []);
    });
    return map;
  }, [activeLoads, bidQueries]);

  const totalBidsReceived = React.useMemo(
    () => activeLoads.reduce((sum, load) => sum + (bidsByLoad.get(load._id)?.length ?? 0), 0),
    [activeLoads, bidsByLoad],
  );

  const dollarsInMotion = React.useMemo(() => {
    return loads
      .filter((load) => load.status === "InTransit")
      .reduce((sum, load) => {
        const accepted = bidsByLoad.get(load._id)?.find((b) => b.status === "Accepted");
        return sum + (accepted?.priceUSD ?? 0);
      }, 0);
  }, [loads, bidsByLoad]);

  const avgTimeToAccept = profileQuery.data?.shipperProfile?.avgTimeToAcceptHours ?? 0;

  const routes: ActiveRoute[] = React.useMemo(
    () =>
      activeLoads.map((load) => ({
        id: load._id,
        origin: load.origin,
        destination: load.destination,
        status: load.status,
      })),
    [activeLoads],
  );

  const activity = React.useMemo(() => buildActivityFeed(loads, bidsByLoad), [loads, bidsByLoad]);

  const recentRows: LoadRow[] = React.useMemo(
    () =>
      [...loads]
        .sort((a, b) => getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt))
        .slice(0, 8)
        .map((load) => ({
          _id: load._id,
          title: load.title,
          origin: load.origin,
          destination: load.destination,
          status: load.status,
          weightKg: load.weightKg,
          bidCount: bidsByLoad.get(load._id)?.length ?? 0,
          updatedAt: load.updatedAt ?? load.createdAt ?? "",
        })),
    [loads, bidsByLoad],
  );

  const isInitialLoading = loadsQuery.isLoading || profileQuery.isLoading;
  const hasNoLoads = loadsQuery.isSuccess && loads.length === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Shipper</p>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1
              className="text-2xl font-bold text-slate-100 sm:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Live view of your active lanes, bids, and load activity.
            </p>
          </div>
          <Link
            href="/shipper/loads/new"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-amber-400/60 bg-amber-400/10 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300 transition-colors hover:bg-amber-400/15"
          >
            <PackagePlus className="h-4 w-4" aria-hidden="true" />
            Post a load
          </Link>
        </div>
      </header>

      {hasNoLoads ? (
        <EmptyDashboard />
      ) : (
        <div className="mt-6 grid grid-cols-12 gap-4">
          <section className="col-span-12 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile label="Active loads" value={activeLoads.length} />
            <KpiTile label="Bids received" value={totalBidsReceived} />
            <KpiTile
              label="Avg time to accept"
              value={avgTimeToAccept}
              maximumFractionDigits={1}
              unit="h"
            />
            <KpiTile label="$ in motion" value={dollarsInMotion} currency="USD" />
          </section>

          <section className="col-span-12 lg:col-span-8">
            <div className="mb-3 flex items-center justify-between">
              <SectionHeader label="Active routes" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                {activeLoads.length} lane{activeLoads.length === 1 ? "" : "s"}
              </span>
            </div>
            {isInitialLoading ? (
              <MapSkeleton />
            ) : activeLoads.length === 0 ? (
              <EmptyMapState />
            ) : (
              <ActiveRoutesMap height="360px" routes={routes} />
            )}
          </section>

          <section aria-label="Activity feed" className="col-span-12 lg:col-span-4">
            <div className="mb-3 flex items-center justify-between">
              <SectionHeader label="Activity" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Last {activity.length}
              </span>
            </div>
            <ActivityFeed events={activity} isLoading={isInitialLoading} />
          </section>

          <section className="col-span-12">
            <div className="mb-3 flex items-center justify-between">
              <SectionHeader label="Recent loads" />
              <Link
                href="/shipper/loads"
                className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-amber-300 hover:text-amber-200"
              >
                See all loads
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            {isInitialLoading ? (
              <TableSkeleton />
            ) : (
              <Table<LoadRow>
                columns={[
                  {
                    key: "title",
                    header: "Load",
                    sortable: true,
                    render: (row) => <span className="text-slate-100">{row.title}</span>,
                  },
                  {
                    key: "lane",
                    header: "Lane",
                    render: (row) => (
                      <span className="font-mono text-[12px] text-slate-300">
                        {row.origin} → {row.destination}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (row) => <StatusPill status={row.status} />,
                  },
                  {
                    key: "weightKg",
                    header: "Weight",
                    align: "right",
                    sortable: true,
                    render: (row) => (
                      <MonoNum value={row.weightKg} unit="kg" className="text-slate-300" />
                    ),
                  },
                  {
                    key: "bidCount",
                    header: "Bids",
                    align: "right",
                    sortable: true,
                    render: (row) => <MonoNum value={row.bidCount} className="text-slate-200" />,
                  },
                ]}
                rows={recentRows}
                rowKey={(row) => row._id}
                onRowClick={(row) => router.push(`/shipper/loads/${row._id}`)}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ActivityFeed({ events, isLoading }: { events: ActivityEvent[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <ul className="fm-panel-muted divide-y divide-slate-800/70 rounded-lg">
        {Array.from({ length: 6 }).map((_, index) => (
          <li key={index} className="flex animate-pulse items-center gap-3 px-3 py-3">
            <span className="h-3.5 w-3.5 rounded-sm bg-slate-800" />
            <span className="h-3 flex-1 rounded bg-slate-800" />
          </li>
        ))}
      </ul>
    );
  }

  if (events.length === 0) {
    return (
      <div className="fm-panel-muted rounded-lg px-4 py-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
          No activity yet
        </p>
      </div>
    );
  }

  return (
    <ul className="fm-panel-muted divide-y divide-slate-800/70 rounded-lg">
      {events.map((event) => (
        <li key={event.id} className="flex items-start gap-3 px-3 py-2.5">
          <span className="mt-0.5 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
            {formatTimeAgo(event.timestamp)}
          </span>
          <ActivityIcon event={event} />
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-slate-200">
            <span className="text-slate-400">{event.description}</span>{" "}
            <span className="text-slate-100">{event.loadTitle}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

function ActivityIcon({ event }: { event: ActivityEvent }) {
  if (event.kind === "bid") {
    if (event.bidStatus === "Accepted") {
      return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[--color-go]" aria-hidden />;
    }
    if (event.bidStatus === "Rejected") {
      return <XCircle className="h-3.5 w-3.5 shrink-0 text-[--color-danger]" aria-hidden />;
    }
    return <Gavel className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />;
  }
  if (event.status === "InTransit") {
    return <Truck className="h-3.5 w-3.5 shrink-0 text-[--color-transit]" aria-hidden />;
  }
  if (event.status === "Delivered") {
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[--color-go]" aria-hidden />;
  }
  if (event.status === "Cancelled") {
    return <XCircle className="h-3.5 w-3.5 shrink-0 text-[--color-danger]" aria-hidden />;
  }
  return <PackagePlus className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />;
}

function MapSkeleton() {
  return (
    <div
      className="fm-panel-muted animate-pulse rounded-xl"
      style={{ height: "360px" }}
      aria-hidden
    />
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-3 border-b border-slate-800/70 px-3 py-3 last:border-b-0"
          style={{ backgroundColor: index % 2 === 0 ? "#121820" : "#151d27" }}
        >
          <span className="h-3 w-1/4 rounded bg-slate-800" />
          <span className="h-3 w-1/3 rounded bg-slate-800" />
          <span className="h-3 w-16 rounded bg-slate-800" />
          <span className="ml-auto h-3 w-12 rounded bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

function EmptyMapState() {
  return (
    <div
      className="fm-panel-muted flex items-center justify-center rounded-xl"
      style={{ height: "360px" }}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
        No active routes — post a load to see lanes here
      </p>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <section
      aria-label="Empty dashboard"
      className="mt-6 flex flex-col items-center gap-4 rounded-xl border-2 border-amber-400/70 bg-amber-400/5 px-6 py-12 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-amber-400/60 bg-slate-950/60 text-amber-300">
        <PackagePlus className="h-6 w-6" aria-hidden />
      </div>
      <div>
        <h2
          className="text-xl font-bold text-slate-100"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Create your first load
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Post a lane to start matching with carriers. Bids, routes, and activity will land here in
          real time.
        </p>
      </div>
      <Link
        href="/shipper/loads/new"
        className="inline-flex items-center gap-2 rounded-md border border-amber-400/70 bg-amber-400/15 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-amber-200 transition-colors hover:bg-amber-400/25"
      >
        <PackagePlus className="h-4 w-4" aria-hidden />
        Post a load
      </Link>
    </section>
  );
}

function buildActivityFeed(loads: Load[], bidsByLoad: Map<string, Bid[]>): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const load of loads) {
    for (const transition of load.statusHistory ?? []) {
      const ts = getTimestamp(transition.timestamp);
      if (!ts) continue;
      events.push({
        id: `status:${load._id}:${transition.to}:${ts}`,
        timestamp: ts,
        kind: "status",
        status: transition.to,
        description: `Status → ${transition.to} on`,
        loadTitle: load.title,
      });
    }

    const bids = bidsByLoad.get(load._id) ?? [];
    for (const bid of bids) {
      const ts = getTimestamp(bid.updatedAt ?? bid.createdAt);
      if (!ts) continue;
      const description =
        bid.status === "Accepted"
          ? `Bid accepted ($${formatPrice(bid.priceUSD)}) on`
          : bid.status === "Rejected"
            ? `Bid rejected on`
            : `New bid ($${formatPrice(bid.priceUSD)}) on`;
      events.push({
        id: `bid:${bid._id}:${bid.status}`,
        timestamp: ts,
        kind: "bid",
        bidStatus: bid.status,
        description,
        loadTitle: load.title,
      });
    }
  }

  return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
}

function getTimestamp(value: string | undefined) {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatTimeAgo(timestamp: number) {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}
