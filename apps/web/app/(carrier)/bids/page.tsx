"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueries, useQuery } from "@tanstack/react-query";
import { MonoNum } from "@/components/primitives/MonoNum";
import { StatusPill } from "@/components/primitives/StatusPill";
import { Table } from "@/components/primitives/Table";
import * as bidsApi from "@/lib/api/bids";
import type { Bid, BidStatus } from "@/lib/api/bids";
import * as loadsApi from "@/lib/api/loads";
import type { Load } from "@/lib/api/loads";

type Tab = "PENDING" | "ACCEPTED" | "REJECTED" | "ALL";
const TABS: Tab[] = ["PENDING", "ACCEPTED", "REJECTED", "ALL"];
const TAB_TO_STATUS: Record<Exclude<Tab, "ALL">, BidStatus> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

type BidRow = {
  _id: string;
  loadId: string;
  loadTitle: string;
  lane: string;
  priceUSD: number;
  estimatedDeliveryHours: number;
  status: BidStatus;
  submittedAt: string;
  submittedAtMs: number;
  [key: string]: unknown;
};

export default function CarrierBidsPage() {
  return (
    <React.Suspense fallback={<PageFallback />}>
      <BidsView />
    </React.Suspense>
  );
}

function PageFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-8 w-40 animate-pulse rounded bg-slate-800" />
      <div className="mt-6">
        <TableSkeleton />
      </div>
    </div>
  );
}

function BidsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const setTab = React.useCallback(
    (next: Tab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "PENDING") params.delete("tab");
      else params.set("tab", next);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  const bidsQuery = useQuery({
    queryKey: ["bids", "my"],
    queryFn: bidsApi.listMine,
    staleTime: 60 * 1000,
  });

  const bids = React.useMemo(() => bidsQuery.data ?? [], [bidsQuery.data]);

  const uniqueLoadIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const b of bids) set.add(b.loadId);
    return Array.from(set);
  }, [bids]);

  const loadQueries = useQueries({
    queries: uniqueLoadIds.map((id) => ({
      queryKey: ["loads", "by-id", id],
      queryFn: () => loadsApi.get(id),
      retry: false,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const loadsById = React.useMemo(() => {
    const map = new Map<string, Load>();
    loadQueries.forEach((q, i) => {
      if (q.data) map.set(uniqueLoadIds[i], q.data);
    });
    return map;
  }, [loadQueries, uniqueLoadIds]);

  const rows = React.useMemo<BidRow[]>(() => {
    return bids
      .map((bid) => toRow(bid, loadsById.get(bid.loadId)))
      .sort((a, b) => b.submittedAtMs - a.submittedAtMs);
  }, [bids, loadsById]);

  const counts = React.useMemo(() => {
    let pending = 0;
    let won = 0;
    let lost = 0;
    for (const b of bids) {
      if (b.status === "Pending") pending++;
      else if (b.status === "Accepted") won++;
      else if (b.status === "Rejected") lost++;
    }
    return { pending, won, lost };
  }, [bids]);

  const filtered = React.useMemo(() => {
    if (tab === "ALL") return rows;
    return rows.filter((r) => r.status === TAB_TO_STATUS[tab]);
  }, [rows, tab]);

  const isLoading = bidsQuery.isLoading;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Carrier</p>
          <h1
            className="mt-1 text-2xl font-bold text-slate-100 sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            My bids
          </h1>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
          <span className="text-amber-300">{counts.pending}</span>
          <span className="text-slate-500"> PENDING · </span>
          <span className="text-[--color-go]">{counts.won}</span>
          <span className="text-slate-500"> WON · </span>
          <span className="text-[--color-danger]">{counts.lost}</span>
          <span className="text-slate-500"> LOST</span>
        </p>
      </header>

      <div
        className="mt-6 flex flex-wrap gap-2 border-b border-slate-800"
        role="tablist"
        aria-label="Bid status"
      >
        {TABS.map((t) => {
          const active = t === tab;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors ${
                active
                  ? "border-amber-400 text-amber-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <TableSkeleton />
        ) : bidsQuery.isError ? (
          <EmptyMono label="FAILED TO LOAD BIDS" />
        ) : filtered.length === 0 ? (
          <EmptyMono label={`NO ${tab} BIDS`} />
        ) : (
          <Table<BidRow>
            columns={[
              {
                key: "loadTitle",
                header: "Load",
                sortable: true,
                render: (row) => (
                  <span className="font-medium text-slate-100">{row.loadTitle}</span>
                ),
              },
              {
                key: "lane",
                header: "Lane",
                sortable: true,
                render: (row) => (
                  <span className="font-mono text-[12px] tracking-[0.04em] text-slate-300">
                    {row.lane}
                  </span>
                ),
              },
              {
                key: "priceUSD",
                header: "Your price",
                sortable: true,
                align: "right",
                render: (row) => <MonoNum value={row.priceUSD} currency="USD" />,
              },
              {
                key: "estimatedDeliveryHours",
                header: "Your ETA",
                sortable: true,
                align: "right",
                render: (row) => <MonoNum value={row.estimatedDeliveryHours} unit="h" />,
              },
              {
                key: "submittedAt",
                header: "Submitted",
                sortable: true,
                sortKey: (row) => row.submittedAtMs,
                render: (row) => (
                  <span className="font-mono text-[12px] text-slate-400">
                    {formatSubmitted(row.submittedAtMs)}
                  </span>
                ),
              },
              {
                key: "status",
                header: "Status",
                sortable: true,
                render: (row) => <StatusPill status={row.status} />,
              },
            ]}
            rows={filtered}
            rowKey={(row) => row._id}
            onRowClick={(row) => router.push(`/marketplace/${row.loadId}`)}
          />
        )}
      </div>
    </div>
  );
}

function toRow(bid: Bid, load: Load | undefined): BidRow {
  const submittedAt = bid.createdAt ?? "";
  const submittedAtMs = submittedAt ? Date.parse(submittedAt) : 0;
  return {
    _id: bid._id,
    loadId: bid.loadId,
    loadTitle: load?.title ?? "—",
    lane: load ? `${load.origin} → ${load.destination}` : "—",
    priceUSD: bid.priceUSD,
    estimatedDeliveryHours: bid.estimatedDeliveryHours,
    status: bid.status,
    submittedAt,
    submittedAtMs: Number.isFinite(submittedAtMs) ? submittedAtMs : 0,
  };
}

function parseTab(value: string | null): Tab {
  const upper = (value ?? "").toUpperCase();
  return (TABS as string[]).includes(upper) ? (upper as Tab) : "PENDING";
}

function formatSubmitted(ms: number) {
  if (!ms) return "—";
  const diffMs = Date.now() - ms;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function EmptyMono({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/35 px-4 py-16 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">{label}</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800">
      <div className="h-9 bg-slate-900" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse border-t border-slate-800/70"
          style={{ backgroundColor: i % 2 === 0 ? "#121820" : "#151d27" }}
        />
      ))}
    </div>
  );
}
