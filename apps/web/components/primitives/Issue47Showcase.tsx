'use client';

import React, { useMemo } from 'react';
import { KpiTile } from './KpiTile';
import { MonoNum } from './MonoNum';
import { SectionHeader } from './SectionHeader';
import { StatusPill, type FreightStatus } from './StatusPill';
import { Table } from './Table';
import { ToastHost, useToastQueue } from './ToastHost';

type Row = {
  id: string;
  lane: string;
  rpm: number;
  weight: number;
  status: FreightStatus;
};

const statuses: FreightStatus[] = [
  'Draft',
  'Posted',
  'Matched',
  'InTransit',
  'Delivered',
  'Cancelled',
  'Pending',
  'Accepted',
  'Rejected',
];

export function Issue47Showcase() {
  const { toasts, pushToast, dismissToast } = useToastQueue();

  const rows = useMemo<Row[]>(() => {
    return Array.from({ length: 600 }).map((_, index) => ({
      id: `FM-${String(index + 1).padStart(5, '0')}`,
      lane: index % 2 === 0 ? 'TX → CA' : 'IL → GA',
      rpm: Number((2 + ((index % 17) * 0.13)).toFixed(2)),
      weight: 18000 + (index % 15) * 1200,
      status: statuses[index % statuses.length],
    }));
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader label="ops console / kpis" />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Open Loads" value={1842} trend={{ direction: 'up', value: 4.3 }} />
        <KpiTile label="Avg RPM" value={2.84} trend={{ direction: 'down', value: 1.1 }} currency="USD" />
        <KpiTile label="On-time Delivery" value={97.6} unit="%" />
        <KpiTile label="Gross Revenue" value={1284500} currency="USD" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
        {statuses.map((status) => (
          <StatusPill key={status} status={status} />
        ))}
      </div>

      <div className="space-y-2">
        <SectionHeader label="dense loads table" />
        <Table<Row>
          columns={[
            { key: 'id', header: 'Load', sortable: true },
            { key: 'lane', header: 'Lane', sortable: true },
            {
              key: 'weight',
              header: 'Weight',
              sortable: true,
              align: 'right',
              render: (row) => <MonoNum value={row.weight} unit="lb" />,
            },
            {
              key: 'rpm',
              header: 'RPM',
              sortable: true,
              align: 'right',
              render: (row) => <MonoNum value={row.rpm} currency="USD" maximumFractionDigits={2} minimumFractionDigits={2} />,
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              render: (row) => <StatusPill status={row.status} />,
            },
          ]}
          rows={rows}
          rowKey={(row) => row.id}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => pushToast('Marketplace refreshed with 24 new loads.', 'info')}
          className="rounded border border-amber-500/50 bg-amber-500/10 px-3 py-2 font-mono text-xs uppercase tracking-widest text-amber-300"
        >
          Trigger Info Toast
        </button>
        <button
          type="button"
          onClick={() => pushToast('Load sync failed — retrying in 10 seconds.', 'error')}
          className="rounded border border-[--color-danger]/50 bg-[--color-danger]/10 px-3 py-2 font-mono text-xs uppercase tracking-widest text-[--color-danger]"
        >
          Trigger Error Toast
        </button>
      </div>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
