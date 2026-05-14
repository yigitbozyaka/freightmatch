"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Circle, Gauge, Sparkles, Star, XCircle } from "lucide-react";
import { RouteMap } from "@/components/maps/RouteMap";
import { Button } from "@/components/primitives/button";
import { MonoNum } from "@/components/primitives/MonoNum";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { StatusPill } from "@/components/primitives/StatusPill";
import { ToastHost, useToastQueue } from "@/components/primitives/ToastHost";
import { ApiResponseError } from "@/lib/api/client";
import * as bidsApi from "@/lib/api/bids";
import type { Bid } from "@/lib/api/bids";
import * as loadsApi from "@/lib/api/loads";
import type { Load, LoadStatus } from "@/lib/api/loads";
import * as matchApi from "@/lib/api/match";
import type { Recommendation } from "@/lib/api/match";
import { resolveUploadedPhotoUrl } from "@/lib/api/uploads";
import { getUserById, type ProfileResponse } from "@/lib/api/users";

const VALID_TRANSITIONS: Record<LoadStatus, LoadStatus[]> = {
  Draft: ["Posted", "Cancelled"],
  Posted: ["Cancelled"],
  Matched: ["Cancelled"],
  InTransit: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

const STATUS_TIMELINE_ORDER: LoadStatus[] = [
  "Draft",
  "Posted",
  "Matched",
  "InTransit",
  "Delivered",
];

export default function LoadDetailPage() {
  const params = useParams<{ id: string }>();
  const loadId = params?.id;
  const queryClient = useQueryClient();
  const { toasts, pushToast, dismissToast } = useToastQueue();

  const loadQuery = useQuery({
    queryKey: ["loads", loadId],
    queryFn: () => loadsApi.get(loadId!),
    enabled: Boolean(loadId),
  });

  const bidsQuery = useQuery({
    queryKey: ["bids", "for-load", loadId],
    queryFn: () => bidsApi.listForLoad(loadId!),
    enabled: Boolean(loadId),
  });

  const matchQuery = useQuery({
    queryKey: ["match", loadId],
    queryFn: () => matchApi.getRecommendations(loadId!),
    enabled: Boolean(loadId),
    retry: (failureCount, error) => {
      if (error instanceof ApiResponseError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const bids = React.useMemo(() => bidsQuery.data ?? [], [bidsQuery.data]);
  const recommendations = React.useMemo(
    () => matchQuery.data?.recommendations ?? [],
    [matchQuery.data],
  );

  const carrierIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const bid of bids) {
      if (bid.carrierId) set.add(bid.carrierId);
    }
    for (const rec of recommendations) {
      if (rec.carrierId) set.add(rec.carrierId);
    }
    return Array.from(set);
  }, [bids, recommendations]);

  const carrierQueries = useQueries({
    queries: carrierIds.map((id) => ({
      queryKey: ["users", id],
      queryFn: () => getUserById(id),
      retry: false,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const carriersById = React.useMemo(() => {
    const map = new Map<string, ProfileResponse>();
    carrierIds.forEach((id, index) => {
      const data = carrierQueries[index]?.data;
      if (data) map.set(id, data);
    });
    return map;
  }, [carrierIds, carrierQueries]);

  const recommendationByCarrier = React.useMemo(() => {
    const map = new Map<string, Recommendation>();
    for (const rec of recommendations) map.set(rec.carrierId, rec);
    return map;
  }, [recommendations]);

  const sortedBids = React.useMemo(() => {
    return [...bids].sort((a, b) => {
      const scoreA = a.carrierId ? (recommendationByCarrier.get(a.carrierId)?.score ?? -1) : -1;
      const scoreB = b.carrierId ? (recommendationByCarrier.get(b.carrierId)?.score ?? -1) : -1;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.priceUSD - b.priceUSD;
    });
  }, [bids, recommendationByCarrier]);

  const bidderIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const bid of bids) if (bid.carrierId) set.add(bid.carrierId);
    return set;
  }, [bids]);

  const suggestedRecommendations = React.useMemo(
    () =>
      recommendations
        .filter((rec) => !bidderIds.has(rec.carrierId))
        .sort((a, b) => b.score - a.score),
    [recommendations, bidderIds],
  );

  const transitionMutation = useMutation({
    mutationFn: (next: LoadStatus) => loadsApi.updateStatus(loadId!, next),
    onSuccess: (data, next) => {
      queryClient.setQueryData(["loads", loadId], data);
      void queryClient.invalidateQueries({ queryKey: ["loads", "my"] });
      pushToast(`Status updated to ${next}`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Could not update status";
      pushToast(message, "error");
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (bidId: string) => bidsApi.accept(bidId),
    onMutate: async (bidId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["bids", "for-load", loadId] }),
        queryClient.cancelQueries({ queryKey: ["loads", loadId] }),
      ]);
      const prevBids = queryClient.getQueryData<Bid[]>(["bids", "for-load", loadId]);
      const prevLoad = queryClient.getQueryData<Load>(["loads", loadId]);
      if (prevBids) {
        queryClient.setQueryData<Bid[]>(
          ["bids", "for-load", loadId],
          prevBids.map((b) =>
            b._id === bidId
              ? { ...b, status: "Accepted" }
              : b.status === "Pending"
                ? { ...b, status: "Rejected" }
                : b,
          ),
        );
      }
      if (prevLoad && prevLoad.status === "Posted") {
        queryClient.setQueryData<Load>(["loads", loadId], { ...prevLoad, status: "Matched" });
      }
      return { prevBids, prevLoad };
    },
    onError: (error, _bidId, context) => {
      if (context?.prevBids) {
        queryClient.setQueryData(["bids", "for-load", loadId], context.prevBids);
      }
      if (context?.prevLoad) {
        queryClient.setQueryData(["loads", loadId], context.prevLoad);
      }
      const message = error instanceof Error ? error.message : "Could not accept bid";
      pushToast(message, "error");
    },
    onSuccess: () => {
      pushToast("Bid accepted — load matched");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["bids", "for-load", loadId] });
      void queryClient.invalidateQueries({ queryKey: ["loads", loadId] });
      void queryClient.invalidateQueries({ queryKey: ["loads", "my"] });
    },
  });

  if (!loadId) return null;

  if (loadQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (loadQuery.isError || !loadQuery.data) {
    const status = loadQuery.error instanceof ApiResponseError ? loadQuery.error.status : null;
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <BackLink />
        <div className="mt-6 rounded-lg border border-[--color-danger]/40 bg-[--color-danger]/5 px-6 py-12 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[--color-danger]">
            {status === 404 ? "Load not found" : "Failed to load"}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {status === 404
              ? "This load may have been deleted or you don't have access."
              : loadQuery.error instanceof Error
                ? loadQuery.error.message
                : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  const load = loadQuery.data;
  const allowedTransitions = VALID_TRANSITIONS[load.status] ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <BackLink />

      <header className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-widest text-amber-400">
            Load · {load._id.slice(-6)}
          </p>
          <h1
            className="mt-1 truncate text-2xl font-bold text-slate-100 sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {load.title}
          </h1>
          <p className="mt-1 font-mono text-[12px] text-slate-400">
            {load.origin} → {load.destination}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={load.status} />
          {allowedTransitions.map((next) => (
            <Button
              key={next}
              size="sm"
              variant={next === "Cancelled" ? "danger" : "primary"}
              loading={transitionMutation.isPending && transitionMutation.variables === next}
              disabled={transitionMutation.isPending}
              onClick={() => transitionMutation.mutate(next)}
            >
              {transitionLabel(load.status, next)}
            </Button>
          ))}
        </div>
      </header>

      <div className="mt-6 grid grid-cols-12 gap-4">
        <section className="col-span-12 lg:col-span-7 xl:col-span-7">
          <SectionHeader label="Route" />
          <div className="mt-3">
            <RouteMap origin={load.origin} destination={load.destination} height="320px" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FactCard label="Cargo" value={load.cargoType} />
            <FactCard
              label="Weight"
              value={
                <MonoNum value={load.weightKg} unit="kg" className="text-slate-100 text-base" />
              }
            />
            <FactCard
              label="Deadline"
              value={
                <MonoNum value={load.deadlineHours} unit="h" className="text-slate-100 text-base" />
              }
            />
            <FactCard
              label="Bids"
              value={<MonoNum value={bids.length} className="text-slate-100 text-base" />}
            />
          </div>

          <div className="mt-6">
            <SectionHeader label="Status timeline" />
            <div className="mt-3">
              <StatusTimeline load={load} />
            </div>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-5 xl:col-span-5" aria-label="Bid inbox">
          <div className="mb-3 flex items-center justify-between">
            <SectionHeader label="Bid inbox" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              {bids.length} bid{bids.length === 1 ? "" : "s"} · ranked by AI
            </span>
          </div>
          <BidList
            bids={sortedBids}
            isLoading={bidsQuery.isLoading}
            isError={bidsQuery.isError}
            error={bidsQuery.error}
            carriersById={carriersById}
            recommendationByCarrier={recommendationByCarrier}
            loadStatus={load.status}
            acceptingBidId={acceptMutation.isPending ? (acceptMutation.variables ?? null) : null}
            onAccept={(bidId) => acceptMutation.mutate(bidId)}
          />
        </section>

        <section className="col-span-12 mt-2" aria-label="AI recommendations">
          <div className="mb-3 flex items-center justify-between">
            <SectionHeader label="AI recommendations" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              {suggestedRecommendations.length} carrier
              {suggestedRecommendations.length === 1 ? "" : "s"} not yet bidding
            </span>
          </div>
          <RecommendationGrid
            isLoading={matchQuery.isLoading}
            error={matchQuery.error}
            recommendations={suggestedRecommendations}
            carriersById={carriersById}
            onInvite={(carrierId) => {
              const carrier = carriersById.get(carrierId);
              const name = carrier?.email?.split("@")[0] ?? "carrier";
              pushToast(`Invitation sent to ${name}`);
            }}
          />
        </section>
      </div>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function transitionLabel(current: LoadStatus, next: LoadStatus): string {
  if (next === "Cancelled") return "Cancel";
  if (current === "Draft" && next === "Posted") return "Post now";
  if (current === "InTransit" && next === "Delivered") return "Mark delivered";
  return next;
}

function BackLink() {
  return (
    <Link
      href="/shipper/dashboard"
      className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400 transition-colors hover:text-amber-300"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      Back to dashboard
    </Link>
  );
}

function FactCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm text-slate-100">{value}</p>
    </div>
  );
}

function StatusTimeline({ load }: { load: Load }) {
  const history = load.statusHistory ?? [];
  const isCancelled = load.status === "Cancelled";

  if (isCancelled) {
    const cancelledEntry = history.find((h) => h.to === "Cancelled");
    return (
      <ol className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        {history.map((entry, idx) => (
          <TimelineRow
            key={`${entry.to}-${idx}`}
            status={entry.to}
            timestamp={entry.timestamp}
            state="done"
          />
        ))}
        {!cancelledEntry ? (
          <TimelineRow status="Cancelled" timestamp={undefined} state="done" />
        ) : null}
      </ol>
    );
  }

  const currentIndex = STATUS_TIMELINE_ORDER.indexOf(load.status);
  const reachedTimestamps = new Map<LoadStatus, string | undefined>();
  for (const entry of history) reachedTimestamps.set(entry.to, entry.timestamp);

  return (
    <ol className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
      {STATUS_TIMELINE_ORDER.map((status, idx) => {
        let state: "done" | "current" | "pending";
        if (idx < currentIndex) state = "done";
        else if (idx === currentIndex) state = "current";
        else state = "pending";
        const ts = reachedTimestamps.get(status);
        return (
          <TimelineRow
            key={status}
            status={status}
            timestamp={ts}
            state={state}
            isLast={idx === STATUS_TIMELINE_ORDER.length - 1}
          />
        );
      })}
    </ol>
  );
}

function TimelineRow({
  status,
  timestamp,
  state,
  isLast = false,
}: {
  status: LoadStatus;
  timestamp: string | undefined;
  state: "done" | "current" | "pending";
  isLast?: boolean;
}) {
  const Icon =
    status === "Cancelled"
      ? XCircle
      : state === "done"
        ? CheckCircle2
        : state === "current"
          ? Gauge
          : Circle;
  const iconClass =
    status === "Cancelled"
      ? "text-[--color-danger]"
      : state === "done"
        ? "text-[--color-go]"
        : state === "current"
          ? "text-amber-400 animate-pulse"
          : "text-slate-600";
  const textClass = state === "pending" ? "text-slate-500" : "text-slate-100";

  return (
    <li className="flex items-start gap-3">
      <div className="relative flex flex-col items-center">
        <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} aria-hidden />
        {!isLast ? <span className="mt-1 h-6 w-px bg-slate-800" aria-hidden /> : null}
      </div>
      <div className="flex flex-1 items-center justify-between gap-3 pt-[1px]">
        <span className={`font-mono text-[12px] uppercase tracking-[0.18em] ${textClass}`}>
          {status}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-slate-500">
          {timestamp ? formatTimestamp(timestamp) : "—"}
        </span>
      </div>
    </li>
  );
}

type BidListProps = {
  bids: Bid[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  carriersById: Map<string, ProfileResponse>;
  recommendationByCarrier: Map<string, Recommendation>;
  loadStatus: LoadStatus;
  acceptingBidId: string | null;
  onAccept: (bidId: string) => void;
};

function BidList({
  bids,
  isLoading,
  isError,
  error,
  carriersById,
  recommendationByCarrier,
  loadStatus,
  acceptingBidId,
  onAccept,
}: BidListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-lg border border-slate-800 bg-slate-900/40"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-[--color-danger]/40 bg-[--color-danger]/5 px-4 py-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[--color-danger]">
          Failed to load bids
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-4 py-10 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
          No bids yet
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {loadStatus === "Draft"
            ? "Post the load to start receiving bids."
            : "Carriers will appear here as they bid."}
        </p>
      </div>
    );
  }

  const canAccept = loadStatus === "Posted";
  const acceptInFlight = acceptingBidId !== null;

  return (
    <ul className="space-y-2">
      {bids.map((bid) => (
        <li key={bid._id}>
          <BidCard
            bid={bid}
            carrier={bid.carrierId ? carriersById.get(bid.carrierId) : undefined}
            recommendation={bid.carrierId ? recommendationByCarrier.get(bid.carrierId) : undefined}
            canAccept={canAccept && !acceptInFlight}
            isAccepting={acceptingBidId === bid._id}
            onAccept={() => onAccept(bid._id)}
          />
        </li>
      ))}
    </ul>
  );
}

function BidCard({
  bid,
  carrier,
  recommendation,
  canAccept,
  isAccepting,
  onAccept,
}: {
  bid: Bid;
  carrier: ProfileResponse | undefined;
  recommendation: Recommendation | undefined;
  canAccept: boolean;
  isAccepting: boolean;
  onAccept: () => void;
}) {
  const carrierProfile = carrier?.carrierProfile ?? null;
  const displayName = carrier?.email?.split("@")[0] ?? "Unknown carrier";
  const trustScore = carrierProfile?.trustScore;
  const rating = carrierProfile?.rating;
  const avgEta =
    (carrierProfile?.completedShipments ?? 0) > 0 ? carrierProfile?.avgEtaHours : undefined;

  const isAccepted = bid.status === "Accepted";
  const isRejected = bid.status === "Rejected";

  return (
    <article
      className={`rounded-lg border bg-slate-900/60 p-3 transition-colors ${
        isAccepted
          ? "border-[--color-go]/60 bg-[--color-go]/5"
          : isRejected
            ? "border-slate-800 opacity-60"
            : "border-slate-800 hover:border-slate-700"
      }`}
    >
      <div className="flex items-start gap-3">
        <CarrierAvatar name={displayName} photoUrl={carrierProfile?.profilePhotoUrl ?? null} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-100">{displayName}</p>
            <StatusPill status={bid.status} />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-slate-400">
            {trustScore !== undefined ? (
              <span>
                trust <span className="text-slate-200">{Math.round(trustScore)}</span>
              </span>
            ) : null}
            {rating !== undefined ? (
              <span className="inline-flex items-center gap-0.5">
                <Star className="h-3 w-3 text-amber-400" aria-hidden />
                <span className="text-slate-200">{rating.toFixed(1)}</span>
              </span>
            ) : null}
            {avgEta !== undefined ? (
              <span>
                avg ETA <span className="text-slate-200">{avgEta}h</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded border border-slate-800 bg-slate-950/40 px-2.5 py-1.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">Price</p>
          <MonoNum value={bid.priceUSD} currency="USD" className="text-base text-slate-100" />
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/40 px-2.5 py-1.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">ETA</p>
          <MonoNum
            value={bid.estimatedDeliveryHours}
            unit="h"
            className="text-base text-slate-100"
          />
        </div>
      </div>

      {recommendation ? (
        <div className="mt-3">
          <ScoreBar score={recommendation.score} />
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-slate-400">
            <Sparkles className="mr-1 inline h-3 w-3 text-amber-400" aria-hidden />
            {recommendation.reason}
          </p>
        </div>
      ) : null}

      {bid.status === "Pending" ? (
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            disabled={!canAccept || isAccepting}
            loading={isAccepting}
            onClick={onAccept}
          >
            Accept
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function CarrierAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const resolvedPhotoUrl = resolveUploadedPhotoUrl(photoUrl);
  if (resolvedPhotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedPhotoUrl}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-full border border-slate-700 object-cover"
      />
    );
  }
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 font-mono text-xs text-slate-300"
    >
      {initials}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(1, score));
  const pct = Math.round(clamped * 100);
  const tone =
    clamped >= 0.7 ? "bg-[--color-go]" : clamped >= 0.4 ? "bg-amber-400" : "bg-slate-500";
  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="AI match score"
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800"
      >
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[10px] tabular-nums text-slate-300">{pct}</span>
    </div>
  );
}

function RecommendationGrid({
  isLoading,
  error,
  recommendations,
  carriersById,
  onInvite,
}: {
  isLoading: boolean;
  error: unknown;
  recommendations: Recommendation[];
  carriersById: Map<string, ProfileResponse>;
  onInvite: (carrierId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg border border-slate-800 bg-slate-900/40"
          />
        ))}
      </div>
    );
  }

  if (error && !(error instanceof ApiResponseError && error.status === 404)) {
    return (
      <div className="rounded-lg border border-[--color-danger]/40 bg-[--color-danger]/5 px-4 py-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[--color-danger]">
          Failed to load AI recommendations
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-4 py-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
          No carrier suggestions yet
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Recommendations appear once the load is posted and matched.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {recommendations.map((rec) => (
        <RecommendationCard
          key={rec.carrierId}
          recommendation={rec}
          carrier={carriersById.get(rec.carrierId)}
          onInvite={() => onInvite(rec.carrierId)}
        />
      ))}
    </div>
  );
}

function RecommendationCard({
  recommendation,
  carrier,
  onInvite,
}: {
  recommendation: Recommendation;
  carrier: ProfileResponse | undefined;
  onInvite: () => void;
}) {
  const profile = carrier?.carrierProfile ?? null;
  const name = carrier?.email?.split("@")[0] ?? `Carrier · ${recommendation.carrierId.slice(-6)}`;
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <div className="flex items-start gap-3">
        <CarrierAvatar name={name} photoUrl={profile?.profilePhotoUrl ?? null} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">{name}</p>
          <div className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[10px] text-slate-400">
            {profile?.truckType ? <span>{profile.truckType}</span> : null}
            {profile?.homeCity ? <span>· {profile.homeCity}</span> : null}
            {profile?.rating !== undefined ? (
              <span className="inline-flex items-center gap-0.5">
                <Star className="h-2.5 w-2.5 text-amber-400" aria-hidden />
                {profile.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <ScoreBar score={recommendation.score} />
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-slate-400">
          {recommendation.reason}
        </p>
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="secondary" onClick={onInvite}>
          Invite to bid
        </Button>
      </div>
    </article>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-3 w-32 animate-pulse rounded bg-slate-800" />
      <div className="mt-4 h-9 w-72 animate-pulse rounded bg-slate-800" />
      <div className="mt-2 h-3 w-56 animate-pulse rounded bg-slate-800" />
      <div className="mt-6 grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <div className="h-[320px] animate-pulse rounded-xl bg-slate-900/40" />
        </div>
        <div className="col-span-12 lg:col-span-5 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-slate-900/40" />
          ))}
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(value: string): string {
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "—";
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
