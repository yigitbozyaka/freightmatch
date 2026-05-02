"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueries, useQuery } from "@tanstack/react-query";
import { PackagePlus, Search } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { MonoNum } from "@/components/primitives/MonoNum";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { StatusPill } from "@/components/primitives/StatusPill";
import { Table } from "@/components/primitives/Table";
import { cn } from "@/lib/ui/cn";
import * as bidsApi from "@/lib/api/bids";
import * as loadsApi from "@/lib/api/loads";
import type { Load, LoadStatus } from "@/lib/api/loads";

const STATUSES: LoadStatus[] = [
  "Draft",
  "Posted",
  "Matched",
  "InTransit",
  "Delivered",
  "Cancelled",
];
const STATUS_ORDER: Record<LoadStatus, number> = {
  Draft: 0,
  Posted: 1,
  Matched: 2,
  InTransit: 3,
  Delivered: 4,
  Cancelled: 5,
};
const CARGO_OPTIONS = [
  { value: "all", label: "Any cargo" },
  { value: "general", label: "General" },
  { value: "refrigerated", label: "Refrigerated" },
  { value: "hazmat", label: "Hazmat" },
  { value: "fragile", label: "Fragile" },
  { value: "oversized", label: "Oversized" },
] as const;
const PAGE_SIZE = 20;

type LoadRow = {
  _id: string;
  title: string;
  shortId: string;
  origin: string;
  destination: string;
  cargoType: string;
  status: LoadStatus;
  weightKg: number;
  bidCount: number;
  deadlineHours: number;
  createdAt: string;
  [key: string]: unknown;
};

export default function ShipperLoadsPage() {
  return (
    <React.Suspense fallback={<PageFallback />}>
      <LoadsView />
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

function LoadsView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = React.useMemo(() => parseFilters(searchParams), [searchParams]);
  const [searchInput, setSearchInput] = React.useState(filters.q);
  React.useEffect(() => setSearchInput(filters.q), [filters.q]);

  const setParam = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (!("page" in patch)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      if (searchInput !== filters.q) setParam({ q: searchInput || null });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [searchInput, filters.q, setParam]);

  const loadsQuery = useQuery({
    queryKey: ["loads", "my"],
    queryFn: loadsApi.list,
  });

  const loads = React.useMemo(() => loadsQuery.data ?? [], [loadsQuery.data]);

  const filtered = React.useMemo(() => filterLoads(loads, filters), [loads, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), totalPages);
  React.useEffect(() => {
    if (filters.page !== page) {
      setParam({ page: page === 1 ? null : String(page) });
    }
  }, [filters.page, page, setParam]);
  const pageStart = (page - 1) * PAGE_SIZE;
  const pageItems = React.useMemo(
    () => filtered.slice(pageStart, pageStart + PAGE_SIZE),
    [filtered, pageStart],
  );

  const bidQueries = useQueries({
    queries: pageItems.map((load) => ({
      queryKey: ["bids", "for-load", load._id],
      queryFn: () => bidsApi.listForLoad(load._id),
      retry: false,
      staleTime: 30_000,
    })),
  });

  const rows: LoadRow[] = React.useMemo(
    () =>
      pageItems.map((load, i) => ({
        _id: load._id,
        title: load.title,
        shortId: shortHash(load._id),
        origin: load.origin,
        destination: load.destination,
        cargoType: load.cargoType,
        status: load.status,
        weightKg: load.weightKg,
        bidCount: bidQueries[i]?.data?.length ?? 0,
        deadlineHours: load.deadlineHours,
        createdAt: load.createdAt ?? "",
      })),
    [pageItems, bidQueries],
  );

  const isLoading = loadsQuery.isLoading;
  const filterIsActive =
    filters.q.length > 0 ||
    filters.statuses.size > 0 ||
    filters.cargo !== "all" ||
    filters.minWeight !== null ||
    filters.maxWeight !== null;

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
              Loads
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Every lane you&apos;ve posted, with bids and status at a glance.
            </p>
          </div>
          <Button asChild variant="primary" size="md">
            <Link href="/shipper/loads/new">
              <PackagePlus className="h-4 w-4" aria-hidden /> + New load
            </Link>
          </Button>
        </div>
      </header>

      <section
        aria-label="Filters"
        className="fm-panel-muted mt-6 grid grid-cols-1 gap-3 rounded-lg p-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]"
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden
          />
          <Input
            aria-label="Search loads"
            className="pl-9"
            placeholder="Search title, origin, or destination"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <Select
          value={filters.cargo}
          onValueChange={(v) => setParam({ cargo: v === "all" ? null : v })}
        >
          <SelectTrigger aria-label="Cargo type" className="min-w-[10rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CARGO_OPTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <WeightFilter
          min={filters.minWeight}
          max={filters.maxWeight}
          onChange={(min, max) =>
            setParam({
              minW: min === null ? null : String(min),
              maxW: max === null ? null : String(max),
            })
          }
        />

        <Button
          variant="ghost"
          size="md"
          onClick={() => setParam({ q: null, status: null, cargo: null, minW: null, maxW: null })}
          disabled={!filterIsActive}
          className="self-stretch"
        >
          Clear
        </Button>

        <div className="col-span-full flex flex-wrap gap-1.5">
          {STATUSES.map((s) => {
            const active = filters.statuses.has(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  const next = new Set(filters.statuses);
                  if (active) next.delete(s);
                  else next.add(s);
                  setParam({ status: next.size === 0 ? null : Array.from(next).join(",") });
                }}
                className={cn(
                  "fm-focus-ring rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors",
                  active
                    ? "border-amber-400/70 bg-amber-400/15 text-amber-100"
                    : "border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200",
                )}
                aria-pressed={active}
              >
                {s}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-3 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
          {filterIsActive ? <span className="text-slate-600"> · filtered</span> : null}
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
          Page {page} / {totalPages}
        </p>
      </div>

      <div className="mt-2">
        {isLoading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState filtered={filterIsActive} />
        ) : (
          <Table<LoadRow>
            columns={[
              {
                key: "shortId",
                header: "ID",
                render: (row) => (
                  <span className="font-mono text-[11px] tracking-wider text-slate-500">
                    {row.shortId}
                  </span>
                ),
              },
              {
                key: "title",
                header: "Title",
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
                key: "cargoType",
                header: "Cargo",
                sortable: true,
                render: (row) => (
                  <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                    {row.cargoType}
                  </span>
                ),
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
                key: "status",
                header: "Status",
                sortable: true,
                sortKey: (row) => STATUS_ORDER[row.status],
                render: (row) => <StatusPill status={row.status} />,
              },
              {
                key: "bidCount",
                header: "Bids",
                align: "right",
                sortable: true,
                render: (row) => <MonoNum value={row.bidCount} className="text-slate-200" />,
              },
              {
                key: "deadlineHours",
                header: "Deadline",
                align: "right",
                sortable: true,
                render: (row) => (
                  <span className="font-mono text-[11px] text-slate-400">{row.deadlineHours}h</span>
                ),
              },
              {
                key: "createdAt",
                header: "Created",
                align: "right",
                sortable: true,
                sortKey: (row) => Date.parse(row.createdAt) || 0,
                render: (row) => (
                  <span className="font-mono text-[11px] text-slate-500">
                    {formatDate(row.createdAt)}
                  </span>
                ),
              },
            ]}
            rows={rows}
            rowKey={(row) => row._id}
            onRowClick={(row) => router.push(`/shipper/loads/${row._id}`)}
            virtualized
          />
        )}
      </div>

      {filtered.length > PAGE_SIZE ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={(p) => setParam({ page: p === 1 ? null : String(p) })}
        />
      ) : null}
    </div>
  );
}

type Filters = {
  q: string;
  statuses: Set<LoadStatus>;
  cargo: string;
  minWeight: number | null;
  maxWeight: number | null;
  page: number;
};

function parseFilters(params: { get: (k: string) => string | null }): Filters {
  const statusRaw = params.get("status") ?? "";
  const statuses = new Set<LoadStatus>();
  for (const s of statusRaw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)) {
    if ((STATUSES as string[]).includes(s)) statuses.add(s as LoadStatus);
  }
  const num = (k: string) => {
    const v = params.get(k);
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    q: params.get("q") ?? "",
    statuses,
    cargo: params.get("cargo") ?? "all",
    minWeight: num("minW"),
    maxWeight: num("maxW"),
    page: Math.max(1, Number(params.get("page") ?? "1") || 1),
  };
}

function filterLoads(loads: Load[], f: Filters): Load[] {
  const q = f.q.trim().toLowerCase();
  return loads
    .filter((l) => {
      if (f.statuses.size > 0 && !f.statuses.has(l.status)) return false;
      if (f.cargo !== "all" && l.cargoType !== f.cargo) return false;
      if (f.minWeight !== null && l.weightKg < f.minWeight) return false;
      if (f.maxWeight !== null && l.weightKg > f.maxWeight) return false;
      if (
        q &&
        !l.title.toLowerCase().includes(q) &&
        !l.origin.toLowerCase().includes(q) &&
        !l.destination.toLowerCase().includes(q)
      )
        return false;
      return true;
    })
    .sort((a, b) => (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0));
}

function WeightFilter({
  min,
  max,
  onChange,
}: {
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [localMin, setLocalMin] = React.useState(min === null ? "" : String(min));
  const [localMax, setLocalMax] = React.useState(max === null ? "" : String(max));
  React.useEffect(() => setLocalMin(min === null ? "" : String(min)), [min]);
  React.useEffect(() => setLocalMax(max === null ? "" : String(max)), [max]);

  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const label = min === null && max === null ? "Any weight" : `${min ?? 0}–${max ?? "∞"} kg`;

  const apply = () => {
    const a = localMin === "" ? null : Number(localMin);
    const b = localMax === "" ? null : Number(localMax);
    onChange(
      a !== null && Number.isFinite(a) ? a : null,
      b !== null && Number.isFinite(b) ? b : null,
    );
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="fm-focus-ring inline-flex h-11 w-full min-w-[10rem] items-center justify-between gap-3 rounded-md border border-slate-700 bg-slate-800/95 px-3.5 py-3 font-mono text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-slate-600"
      >
        <span className="truncate">{label}</span>
        <span aria-hidden className="text-amber-400">
          ▾
        </span>
      </button>
      {open ? (
        <div className="fm-panel-surface absolute right-0 top-full z-30 mt-1 w-72 rounded-lg p-3 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Weight range (kg)
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              aria-label="Minimum weight"
              type="number"
              min={0}
              placeholder="min"
              value={localMin}
              onChange={(e) => setLocalMin(e.target.value)}
              className="fm-focus-ring rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 placeholder:text-slate-500"
            />
            <input
              aria-label="Maximum weight"
              type="number"
              min={0}
              placeholder="max"
              value={localMax}
              onChange={(e) => setLocalMax(e.target.value)}
              className="fm-focus-ring rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLocalMin("");
                setLocalMax("");
                onChange(null, null);
                setOpen(false);
              }}
            >
              Reset
            </Button>
            <Button variant="primary" size="sm" onClick={apply}>
              Apply
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        ← Prev
      </Button>
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
      >
        Next →
      </Button>
    </nav>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="fm-panel-muted flex flex-col items-center gap-3 rounded-lg px-6 py-12 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400">
        {filtered ? "NO LOADS MATCH" : "NO LOADS YET"}
      </p>
      {!filtered ? (
        <Button asChild variant="primary" size="sm">
          <Link href="/shipper/loads/new">
            <PackagePlus className="h-3.5 w-3.5" aria-hidden /> Post a load
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 border-b border-slate-800/70 px-3 py-3 last:border-b-0"
          style={{ backgroundColor: i % 2 === 0 ? "#121820" : "#151d27" }}
        >
          <span className="h-3 w-12 rounded bg-slate-800" />
          <span className="h-3 w-1/4 rounded bg-slate-800" />
          <span className="h-3 w-1/3 rounded bg-slate-800" />
          <span className="ml-auto h-3 w-16 rounded bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

function shortHash(id: string) {
  return id.slice(-6).toUpperCase();
}

function formatDate(iso: string) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
  });
}
