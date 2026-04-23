'use client';

import Link from 'next/link';
import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { StatusPill } from '@/components/primitives/StatusPill';
import { Table } from '@/components/primitives/Table';
import { listMyLoads, type Load } from '@/lib/api/loads';

const PAGE_SIZE = 20;
const MAX_WEIGHT = 50000;
const STATUS_OPTIONS = [
  'Draft',
  'Posted',
  'Matched',
  'InTransit',
  'Delivered',
  'Cancelled',
  'Pending',
  'Accepted',
  'Rejected',
] as const;

function shortId(id: string) {
  return id.length > 8 ? `#${id.slice(-8)}` : id;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function parseNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ShipperLoadsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedStatuses = useMemo(
    () => searchParams.get('status')?.split(',').filter(Boolean) ?? [],
    [searchParams],
  );
  const cargoType = searchParams.get('cargoType') ?? '';
  const query = searchParams.get('q') ?? '';
  const minWeight = parseNumber(searchParams.get('minWeight'), 0);
  const maxWeight = parseNumber(searchParams.get('maxWeight'), MAX_WEIGHT);
  const page = Math.max(1, parseNumber(searchParams.get('page'), 1));

  const setParam = (name: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!value) params.delete(name);
    else params.set(name, value);

    if (name !== 'page') params.set('page', '1');

    const nextQuery = params.toString();
    router.replace(nextQuery ? `/loads?${nextQuery}` : '/loads');
  };

  const { data = [], isLoading, isError } = useQuery({
    queryKey: [
      'shipper-loads',
      selectedStatuses.join(','),
      cargoType,
      minWeight,
      maxWeight,
      query,
      page,
    ],
    queryFn: () =>
      listMyLoads({
        status: selectedStatuses,
        cargoType: cargoType || undefined,
        minWeight,
        maxWeight,
        q: query || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const cargoTypeOptions = useMemo(
    () => Array.from(new Set(data.map((load) => load.cargoType))).sort((a, b) => a.localeCompare(b)),
    [data],
  );

  const filteredLoads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return data.filter((load) => {
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(load.status);
      const matchesCargoType = !cargoType || load.cargoType === cargoType;
      const matchesWeight = load.weightKg >= minWeight && load.weightKg <= maxWeight;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [load.title, load.origin, load.destination].some((field) =>
          field.toLowerCase().includes(normalizedQuery),
        );

      return matchesStatus && matchesCargoType && matchesWeight && matchesQuery;
    });
  }, [cargoType, data, maxWeight, minWeight, query, selectedStatuses]);

  const totalPages = Math.max(1, Math.ceil(filteredLoads.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedLoads = filteredLoads.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <main className="space-y-6 px-8 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Shipper / Loads</p>
          <h1
            className="text-2xl font-bold text-slate-100"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            My Loads
          </h1>
        </div>

        <Link
          href="/loads/new"
          className="rounded border border-amber-400 bg-amber-400/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-amber-300 transition hover:bg-amber-400/20"
        >
          + New Load
        </Link>
      </header>

      <section className="grid gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-widest text-slate-400">Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((status) => {
              const checked = selectedStatuses.includes(status);

              return (
                <label
                  key={status}
                  className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-xs text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const nextStatuses = event.target.checked
                        ? [...selectedStatuses, status]
                        : selectedStatuses.filter((value) => value !== status);

                      setParam('status', nextStatuses.length > 0 ? nextStatuses.join(',') : undefined);
                    }}
                  />
                  {status}
                </label>
              );
            })}
          </div>
        </div>

        <label className="space-y-2">
          <span className="font-mono text-[11px] uppercase tracking-widest text-slate-400">Cargo Type</span>
          <select
            value={cargoType}
            onChange={(event) => setParam('cargoType', event.target.value || undefined)}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100"
          >
            <option value="">All</option>
            {cargoTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
            Weight (kg): {minWeight} - {maxWeight}
          </p>
          <input
            type="range"
            min={0}
            max={MAX_WEIGHT}
            step={500}
            value={minWeight}
            onChange={(event) => {
              const value = Math.min(Number(event.target.value), maxWeight);
              setParam('minWeight', String(value));
            }}
          />
          <input
            type="range"
            min={0}
            max={MAX_WEIGHT}
            step={500}
            value={maxWeight}
            onChange={(event) => {
              const value = Math.max(Number(event.target.value), minWeight);
              setParam('maxWeight', String(value));
            }}
          />
        </div>

        <label className="space-y-2">
          <span className="font-mono text-[11px] uppercase tracking-widest text-slate-400">Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setParam('q', event.target.value || undefined)}
            placeholder="title / origin / destination"
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100"
          />
        </label>
      </section>

      {isLoading ? (
        <div className="rounded border border-slate-800 p-6 font-mono text-sm text-slate-400">
          Loading loads...
        </div>
      ) : isError ? (
        <div className="rounded border border-[--color-danger]/40 bg-[--color-danger]/10 p-6 font-mono text-sm text-[--color-danger]">
          Failed to load shipper loads.
        </div>
      ) : paginatedLoads.length === 0 ? (
        <div className="rounded border border-dashed border-slate-700 p-10 text-center font-mono text-sm uppercase tracking-[0.2em] text-slate-500">
          NO LOADS MATCH
        </div>
      ) : (
        <Table<Load>
          columns={[
            {
              key: '_id',
              header: 'ID',
              sortable: true,
              render: (row) => <span className="font-mono">{shortId(row._id)}</span>,
            },
            { key: 'title', header: 'Title', sortable: true },
            {
              key: 'origin',
              header: 'Route',
              sortable: true,
              render: (row) => `${row.origin} → ${row.destination}`,
            },
            { key: 'cargoType', header: 'Cargo', sortable: true },
            { key: 'weightKg', header: 'Weight', sortable: true, align: 'right' },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              render: (row) => <StatusPill status={row.status} />,
            },
            {
              key: 'bidsCount',
              header: 'Bids',
              sortable: true,
              align: 'right',
              render: (row) => row.bidsCount ?? 0,
            },
            {
              key: 'deadlineHours',
              header: 'Deadline',
              sortable: true,
              align: 'right',
              render: (row) => `${row.deadlineHours}h`,
            },
            {
              key: 'createdAt',
              header: 'Created',
              sortable: true,
              render: (row) => formatDate(row.createdAt),
            },
          ]}
          rows={paginatedLoads}
          rowKey={(row) => row._id}
          onRowClick={(row) => router.push(`/loads/${row._id}`)}
        />
      )}

      <footer className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="rounded border border-slate-700 px-3 py-1.5 font-mono text-xs text-slate-300 disabled:opacity-40"
          disabled={currentPage <= 1}
          onClick={() => setParam('page', String(currentPage - 1))}
        >
          Prev
        </button>
        <span className="font-mono text-xs text-slate-400">
          Page {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          className="rounded border border-slate-700 px-3 py-1.5 font-mono text-xs text-slate-300 disabled:opacity-40"
          disabled={currentPage >= totalPages}
          onClick={() => setParam('page', String(currentPage + 1))}
        >
          Next
        </button>
      </footer>
    </main>
  );
}

export default function ShipperLoadsPage() {
  return (
    <Suspense fallback={<main className="space-y-6 px-8 py-10 font-mono text-sm text-slate-400">Loading loads...</main>}>
      <ShipperLoadsContent />
    </Suspense>
  );
}
