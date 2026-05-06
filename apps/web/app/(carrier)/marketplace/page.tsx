"use client";

import * as React from "react";
import Link from "next/link";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock3,
  Filter,
  LayoutGrid,
  Map as MapIcon,
  PackageCheck,
  RefreshCw,
  Star,
  Truck,
  X,
} from "lucide-react";
import { MarketplaceMap } from "@/components/maps/MarketplaceMap";
import { RouteMap } from "@/components/maps/RouteMap";
import { Button } from "@/components/primitives/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/primitives/drawer";
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
import * as loadsApi from "@/lib/api/loads";
import type { Load } from "@/lib/api/loads";
import { getProfile, getUserById, type ProfileResponse } from "@/lib/api/users";

const CARGO_TYPES = ["General", "Refrigerated", "Hazmat", "Oversized", "Liquid"] as const;
const ANY_CARGO = "__any_cargo__";

type Filters = {
  cargoType: string;
  minWeight: string;
  maxWeight: string;
  maxDeadline: string;
  origin: string;
};

const DEFAULT_FILTERS: Filters = {
  cargoType: ANY_CARGO,
  minWeight: "",
  maxWeight: "",
  maxDeadline: "",
  origin: "",
};

export default function MarketplacePage() {
  const [view, setView] = React.useState<"cards" | "map">("cards");
  const [filters, setFilters] = React.useState<Filters>(DEFAULT_FILTERS);
  const [drawerLoadId, setDrawerLoadId] = React.useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["users", "profile"],
    queryFn: getProfile,
  });

  const carrierProfile = profileQuery.data?.carrierProfile ?? null;
  const profileIncomplete =
    profileQuery.isSuccess && (!carrierProfile?.truckType || !carrierProfile?.capacityKg);

  const cargoQueryParam =
    filters.cargoType && filters.cargoType !== ANY_CARGO ? filters.cargoType : undefined;

  const loadsQuery = useQuery({
    queryKey: ["loads", "available", cargoQueryParam ?? null],
    queryFn: () => loadsApi.listAvailable({ cargoType: cargoQueryParam }),
  });

  const filteredLoads = React.useMemo(() => {
    const list = loadsQuery.data ?? [];
    const minWeight = filters.minWeight ? Number(filters.minWeight) : null;
    const maxWeight = filters.maxWeight ? Number(filters.maxWeight) : null;
    const maxDeadline = filters.maxDeadline ? Number(filters.maxDeadline) : null;
    const originQuery = filters.origin.trim().toLowerCase();

    return list.filter((load) => {
      if (minWeight !== null && Number.isFinite(minWeight) && load.weightKg < minWeight) {
        return false;
      }
      if (maxWeight !== null && Number.isFinite(maxWeight) && load.weightKg > maxWeight) {
        return false;
      }
      if (
        maxDeadline !== null &&
        Number.isFinite(maxDeadline) &&
        load.deadlineHours > maxDeadline
      ) {
        return false;
      }
      if (originQuery && !load.origin.toLowerCase().includes(originQuery)) {
        return false;
      }
      return true;
    });
  }, [filters, loadsQuery.data]);

  const shipperIds = React.useMemo(() => {
    const seen = new Set<string>();
    for (const load of filteredLoads) {
      if (load.shipperId) seen.add(load.shipperId);
    }
    return Array.from(seen);
  }, [filteredLoads]);

  const shipperQueries = useQueries({
    queries: shipperIds.map((id) => ({
      queryKey: ["users", id],
      queryFn: () => getUserById(id),
      staleTime: 5 * 60 * 1000,
      retry: false,
    })),
  });

  const shipperById = React.useMemo(() => {
    const map = new Map<string, ProfileResponse>();
    shipperQueries.forEach((query, idx) => {
      if (query.data) map.set(shipperIds[idx], query.data);
    });
    return map;
  }, [shipperIds, shipperQueries]);

  const drawerLoad = React.useMemo(
    () => filteredLoads.find((load) => load._id === drawerLoadId) ?? null,
    [filteredLoads, drawerLoadId],
  );

  const totalLoads = loadsQuery.data?.length ?? 0;
  const filteredCount = filteredLoads.length;
  const filtersActive =
    filters.cargoType !== ANY_CARGO ||
    filters.minWeight !== "" ||
    filters.maxWeight !== "" ||
    filters.maxDeadline !== "" ||
    filters.origin !== "";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Carrier</p>
          <h1
            className="mt-1 text-2xl font-bold text-slate-100 sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Marketplace
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            <MonoNum value={filteredCount} className="text-slate-200" /> of{" "}
            <MonoNum value={totalLoads} className="text-slate-200" /> available loads
            {filtersActive ? " match your filters" : ""}.
          </p>
        </div>
        <ViewToggle value={view} onChange={setView} />
      </header>

      {profileIncomplete ? <ProfileIncompleteBanner /> : null}

      <FiltersBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        active={filtersActive}
      />

      {loadsQuery.isLoading ? (
        <ListSkeleton view={view} />
      ) : loadsQuery.isError ? (
        <ErrorPanel onRetry={() => void loadsQuery.refetch()} />
      ) : filteredCount === 0 ? (
        <EmptyState filtered={filtersActive} onReset={() => setFilters(DEFAULT_FILTERS)} />
      ) : view === "cards" ? (
        <CardsGrid loads={filteredLoads} shipperById={shipperById} />
      ) : (
        <MapView loads={filteredLoads} selectedId={drawerLoadId} onPinClick={setDrawerLoadId} />
      )}

      <Drawer
        open={Boolean(drawerLoad)}
        onOpenChange={(open) => {
          if (!open) setDrawerLoadId(null);
        }}
      >
        <DrawerContent aria-describedby="marketplace-drawer-description">
          {drawerLoad ? (
            <PinDrawer
              load={drawerLoad}
              shipper={drawerLoad.shipperId ? shipperById.get(drawerLoad.shipperId) : undefined}
            />
          ) : null}
        </DrawerContent>
      </Drawer>
    </main>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: "cards" | "map";
  onChange: (next: "cards" | "map") => void;
}) {
  return (
    <div
      className="inline-flex w-fit rounded-lg border border-slate-800 bg-slate-900/70 p-1"
      role="tablist"
      aria-label="Marketplace view"
    >
      {(
        [
          { id: "cards", label: "Cards", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
          { id: "map", label: "Map", icon: <MapIcon className="h-3.5 w-3.5" /> },
        ] as const
      ).map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={
              "fm-focus-ring inline-flex h-9 items-center gap-2 rounded-md px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors " +
              (active
                ? "bg-amber-400 text-slate-950"
                : "text-slate-500 hover:bg-slate-800 hover:text-slate-200")
            }
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ProfileIncompleteBanner() {
  return (
    <section
      className="mt-5 flex flex-col gap-3 rounded-lg border border-amber-400/40 bg-amber-400/5 p-4 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <div className="flex items-center gap-3">
        <Truck className="h-4 w-4 text-amber-400" aria-hidden="true" />
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-300">
            Profile incomplete
          </p>
          <p className="mt-1 text-sm text-slate-300">Add truck type and capacity to submit bids.</p>
        </div>
      </div>
      <Button asChild size="sm">
        <Link href="/carrier/profile">Complete profile</Link>
      </Button>
    </section>
  );
}

function FiltersBar({
  filters,
  onChange,
  onReset,
  active,
}: {
  filters: Filters;
  onChange: React.Dispatch<React.SetStateAction<Filters>>;
  onReset: () => void;
  active: boolean;
}) {
  return (
    <section className="fm-panel-muted mt-5 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">Filters</p>
        {active ? (
          <button
            type="button"
            onClick={onReset}
            className="fm-focus-ring ml-auto inline-flex items-center gap-1 rounded font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 transition-colors hover:text-amber-300"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Clear
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <FilterField label="Cargo type">
          <Select
            value={filters.cargoType}
            onValueChange={(value) => onChange((prev) => ({ ...prev, cargoType: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_CARGO}>Any</SelectItem>
              {CARGO_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Weight ≥ kg">
          <Input
            inputMode="numeric"
            value={filters.minWeight}
            onChange={(event) =>
              onChange((prev) => ({ ...prev, minWeight: sanitizeNumber(event.target.value) }))
            }
            placeholder="0"
          />
        </FilterField>

        <FilterField label="Weight ≤ kg">
          <Input
            inputMode="numeric"
            value={filters.maxWeight}
            onChange={(event) =>
              onChange((prev) => ({ ...prev, maxWeight: sanitizeNumber(event.target.value) }))
            }
            placeholder="∞"
          />
        </FilterField>

        <FilterField label="Deadline ≤ h">
          <Input
            inputMode="numeric"
            value={filters.maxDeadline}
            onChange={(event) =>
              onChange((prev) => ({ ...prev, maxDeadline: sanitizeNumber(event.target.value) }))
            }
            placeholder="any"
          />
        </FilterField>

        <FilterField label="Origin contains">
          <Input
            value={filters.origin}
            onChange={(event) => onChange((prev) => ({ ...prev, origin: event.target.value }))}
            placeholder="e.g. Turkey"
          />
        </FilterField>
      </div>
    </section>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function sanitizeNumber(value: string): string {
  return value.replace(/[^\d]/g, "").slice(0, 8);
}

function CardsGrid({
  loads,
  shipperById,
}: {
  loads: Load[];
  shipperById: Map<string, ProfileResponse>;
}) {
  return (
    <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {loads.map((load) => (
        <LoadCard
          key={load._id}
          load={load}
          shipper={load.shipperId ? shipperById.get(load.shipperId) : undefined}
        />
      ))}
    </section>
  );
}

function LoadCard({ load, shipper }: { load: Load; shipper?: ProfileResponse }) {
  const shipperName = shipperLabel(shipper, load.shipperId);
  return (
    <Link
      href={`/marketplace/${load._id}`}
      className="fm-focus-ring fm-panel-muted group relative flex flex-col rounded-lg p-3 transition-colors hover:border-amber-400/40"
    >
      <div className="overflow-hidden rounded-md border border-slate-800">
        <RouteMap origin={load.origin} destination={load.destination} height="138px" />
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">{load.title}</p>
          <p className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
            {load.origin} → {load.destination}
          </p>
        </div>
        <StatusPill status={load.status} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-800 pt-3 font-mono text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <PackageCheck className="h-3 w-3 text-amber-400" aria-hidden="true" />
          <span className="truncate text-slate-200">{load.cargoType}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Truck className="h-3 w-3 text-amber-400" aria-hidden="true" />
          <MonoNum value={load.weightKg} unit="kg" className="text-slate-200" />
        </div>
        <div className="flex items-center gap-1.5">
          <Clock3 className="h-3 w-3 text-amber-400" aria-hidden="true" />
          <MonoNum value={load.deadlineHours} unit="h" className="text-slate-200" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="truncate font-mono text-slate-400">
          <span className="text-slate-500">shipper · </span>
          <span className="text-slate-200">{shipperName}</span>
        </span>
        <ArrowRight
          className="h-3.5 w-3.5 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-400"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

function shipperLabel(shipper: ProfileResponse | undefined, shipperId?: string): string {
  if (shipper) {
    const company = shipper.shipperProfile?.companyName;
    if (company) return company;
    const local = shipper.email?.split("@")[0];
    if (local) return local;
  }
  if (!shipperId) return "Shipper";
  return `Shipper ${shipperId.slice(-6)}`;
}

function MapView({
  loads,
  selectedId,
  onPinClick,
}: {
  loads: Load[];
  selectedId: string | null;
  onPinClick: (id: string) => void;
}) {
  return (
    <section className="mt-5 overflow-hidden rounded-lg border border-slate-800">
      <MarketplaceMap
        height="540px"
        loads={loads}
        onPinClick={onPinClick}
        selectedId={selectedId}
      />
    </section>
  );
}

function PinDrawer({ load, shipper }: { load: Load; shipper?: ProfileResponse }) {
  const shipperName = shipperLabel(shipper, load.shipperId);
  const completed = shipper?.shipperProfile?.completedLoads;

  return (
    <>
      <DrawerHeader>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-400">Load</p>
        <DrawerTitle className="text-xl font-semibold text-slate-100">{load.title}</DrawerTitle>
        <DrawerDescription
          id="marketplace-drawer-description"
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500"
        >
          {load.origin} → {load.destination}
        </DrawerDescription>
      </DrawerHeader>

      <div className="mt-5 overflow-hidden rounded-md border border-slate-800">
        <RouteMap origin={load.origin} destination={load.destination} height="220px" />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <Fact label="Cargo" value={load.cargoType} />
        <Fact label="Weight" value={<MonoNum value={load.weightKg} unit="kg" />} />
        <Fact label="Deadline" value={<MonoNum value={load.deadlineHours} unit="h" />} />
        <Fact
          label="Shipper"
          value={
            <span className="inline-flex items-center gap-1.5">
              <span className="truncate">{shipperName}</span>
              {completed !== undefined ? (
                <span className="inline-flex items-center gap-0.5 font-mono text-[11px] text-slate-400">
                  <Star className="h-3 w-3 text-amber-400" aria-hidden="true" />
                  <MonoNum value={completed} className="text-slate-200" />
                </span>
              ) : null}
            </span>
          }
        />
      </dl>

      <DrawerFooter>
        <DrawerClose asChild>
          <Button variant="ghost">Close</Button>
        </DrawerClose>
        <Button asChild>
          <Link href={`/marketplace/${load._id}`}>
            View details
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </DrawerFooter>
    </>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-200">{value}</dd>
    </div>
  );
}

function ListSkeleton({ view }: { view: "cards" | "map" }) {
  if (view === "map") {
    return (
      <div className="mt-5 h-[540px] animate-pulse rounded-lg border border-slate-800 bg-slate-900/40" />
    );
  }
  return (
    <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className="fm-panel-muted h-[250px] animate-pulse rounded-lg"
          aria-hidden="true"
        />
      ))}
    </section>
  );
}

function EmptyState({ filtered, onReset }: { filtered: boolean; onReset: () => void }) {
  return (
    <section className="mt-5 rounded-lg border border-dashed border-slate-800 bg-slate-950/40 p-12 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
        No loads match
      </p>
      <p className="mt-2 text-sm text-slate-400">
        {filtered
          ? "Try widening the filters or clearing them to see everything."
          : "No available loads right now. Check back soon."}
      </p>
      {filtered ? (
        <div className="mt-4 flex justify-center">
          <Button onClick={onReset} size="sm" variant="secondary">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear filters
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="mt-5 rounded-lg border border-[--color-danger]/40 bg-[--color-danger]/5 p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-red-200">
        Could not load marketplace
      </p>
      <p className="mt-2 text-sm text-slate-300">The available loads endpoint returned an error.</p>
      <div className="mt-4">
        <Button onClick={onRetry} size="sm" variant="secondary">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </Button>
      </div>
    </section>
  );
}
