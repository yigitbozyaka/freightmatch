'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StatusPill } from '@/components/primitives/StatusPill';
import { Table } from '@/components/primitives/Table';
import { listMine, type Bid } from '@/lib/api/bids';

type TabKey = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ALL';
const TABS = ['PENDING', 'ACCEPTED', 'REJECTED', 'ALL'] as const;
const CARRIER_BIDS_QUERY_KEY = ['57-carrier-bids'] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSubmittedAt(value?: string) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRouteLabel(bid: Bid) {
  if (bid.load?.origin && bid.load?.destination) {
    return `${bid.load.origin} → ${bid.load.destination}`;
  }
  return '—';
}

function getTitleLabel(bid: Bid) {
  if (bid.load?.title) return bid.load.title;
  return `Load ${bid.loadId.slice(-8)}`;
}

function getLatestActivityAt(bid: Bid) {
  const submittedAt = bid.submittedAt ? new Date(bid.submittedAt).getTime() : Number.NaN;
  if (!Number.isNaN(submittedAt)) return submittedAt;
  const createdAt = bid.createdAt ? new Date(bid.createdAt).getTime() : Number.NaN;
  if (!Number.isNaN(createdAt)) return createdAt;
  return 0;
}

function toSafeMarketplacePath(loadId: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(loadId)) return null;
  return `/marketplace/${loadId}`;
}

export default function CarrierBidsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('PENDING');
  const { data = [], isLoading, isError } = useQuery({
    queryKey: CARRIER_BIDS_QUERY_KEY,
    queryFn: listMine,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    // refetchOnWindowFocus intentionally not disabled — staleTime handles redundant refetches
  });

  const sortedBids = useMemo(() => {
    return [...data].sort((a, b) => getLatestActivityAt(b) - getLatestActivityAt(a));
  }, [data]);

  const grouped = useMemo(() => {
    const pending = sortedBids.filter((bid) => bid.status === 'Pending');
    const accepted = sortedBids.filter((bid) => bid.status === 'Accepted');
    const rejected = sortedBids.filter((bid) => bid.status === 'Rejected');
    return {
      PENDING: pending,
      ACCEPTED: accepted,
      REJECTED: rejected,
      ALL: sortedBids,
      summary: {
        pending: pending.length,
        won: accepted.length,
        lost: rejected.length,
      },
    };
  }, [sortedBids]);

  const rows = grouped[activeTab];

  return (
    <main className="space-y-6 px-8 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Carrier / Bid Portfolio</p>
          <h1 className="text-2xl font-bold text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>
            Bid Portfolio
          </h1>
        </div>
        <p className="pt-1 font-mono text-xs uppercase tracking-wider text-slate-400">
          {grouped.summary.pending} PENDING · {grouped.summary.won} WON · {grouped.summary.lost} LOST
        </p>
      </header>
      <section className="flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-900/40 p-2">
        {TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition ${
                isActive
                  ? 'border border-amber-400 bg-amber-400/10 text-amber-300'
                  : 'border border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </section>
      {isLoading ? (
        <div className="rounded border border-slate-800 p-6 font-mono text-sm text-slate-400">Loading bids...</div>
      ) : isError ? (
        <div className="rounded border border-[--color-danger]/40 bg-[--color-danger]/10 p-6 font-mono text-sm text-[--color-danger]">
          Failed to load bids.
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded border border-dashed border-slate-700 p-10 text-center font-mono text-sm uppercase tracking-[0.2em] text-slate-500">
          NO {activeTab === 'ALL' ? '' : `${activeTab} `}BIDS
        </div>
      ) : (
        <Table<Bid>
          columns={[
            {
              key: 'loadId',
              header: 'Load Title',
              sortable: false, // rendered value is getTitleLabel(), not loadId — sort would be misleading
              render: (row) => getTitleLabel(row),
            },
            {
              key: 'load',
              header: 'Route',
              sortable: false, // rendered value is a composite string; load is an object, not sortable
              render: (row) => getRouteLabel(row),
            },
            {
              key: 'priceUSD',
              header: 'Your Price',
              sortable: true,
              align: 'right',
              render: (row) => <span className="font-mono">{formatCurrency(row.priceUSD)}</span>,
            },
            {
              key: 'estimatedDeliveryHours',
              header: 'Your ETA',
              sortable: true,
              align: 'right',
              render: (row) => `${row.estimatedDeliveryHours}h`,
            },
            {
              key: 'submittedAt',
              header: 'Submitted',
              sortable: true,
              render: (row) => formatSubmittedAt(row.submittedAt),
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              render: (row) => <StatusPill status={row.status} />,
            },
          ]}
          rows={rows}
          rowKey={(row) => row._id}
          onRowClick={(row) => {
            const path = toSafeMarketplacePath(row.loadId);
            if (!path) return;
            router.push(path);
          }}
        />
      )}
    </main>
  );
}
