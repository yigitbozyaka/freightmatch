export type FreightStatus =
  | "Draft"
  | "Posted"
  | "Matched"
  | "InTransit"
  | "Delivered"
  | "Cancelled"
  | "Pending"
  | "Accepted"
  | "Rejected";

type StatusPillProps = {
  status: FreightStatus;
};

const statusClassMap: Record<FreightStatus, string> = {
  Draft: "text-[--color-amber-400] border-[--color-amber-400]/30 bg-[--color-amber-400]/5",
  Posted: "text-[--color-amber-400] border-[--color-amber-400]/60 bg-[--color-amber-400]/10",
  Matched: "text-[--color-transit] border-[--color-transit]/60 bg-[--color-transit]/10",
  InTransit: "text-[--color-transit] border-[--color-transit]/60 bg-[--color-transit]/10",
  Delivered: "text-[--color-go] border-[--color-go]/60 bg-[--color-go]/10",
  Cancelled: "text-[--color-danger] border-[--color-danger]/35 bg-[--color-danger]/5",
  Pending: "text-[--color-amber-400] border-[--color-amber-400]/60 bg-[--color-amber-400]/10",
  Accepted: "text-[--color-go] border-[--color-go]/60 bg-[--color-go]/10",
  Rejected: "text-[--color-danger] border-[--color-danger]/60 bg-[--color-danger]/10",
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-wide animate-[status-flicker_0.3s_ease-in-out_1] ${statusClassMap[status]}`}
    >
      {status}
    </span>
  );
}
