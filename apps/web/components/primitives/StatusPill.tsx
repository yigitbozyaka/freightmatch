import React from 'react';

export type FreightStatus =
  | 'Draft'
  | 'Posted'
  | 'Matched'
  | 'InTransit'
  | 'Delivered'
  | 'Cancelled'
  | 'Pending'
  | 'Accepted'
  | 'Rejected';

type StatusPillProps = {
  status: FreightStatus;
};

const statusClassMap: Record<FreightStatus, string> = {
  Draft: 'text-slate-300 border-slate-600/80 bg-slate-800/70',
  Posted: 'text-amber-300 border-amber-500/60 bg-amber-500/10',
  Matched: 'text-cyan-300 border-cyan-400/60 bg-cyan-400/10',
  InTransit: 'text-[--color-transit] border-[--color-transit]/60 bg-[--color-transit]/10',
  Delivered: 'text-[--color-go] border-[--color-go]/60 bg-[--color-go]/10',
  Cancelled: 'text-slate-400 border-slate-700 bg-slate-900/80',
  Pending: 'text-amber-300 border-amber-500/60 bg-amber-500/10',
  Accepted: 'text-[--color-go] border-[--color-go]/60 bg-[--color-go]/10',
  Rejected: 'text-[--color-danger] border-[--color-danger]/60 bg-[--color-danger]/10',
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-wide ${statusClassMap[status]}`}>
      {status}
    </span>
  );
}
