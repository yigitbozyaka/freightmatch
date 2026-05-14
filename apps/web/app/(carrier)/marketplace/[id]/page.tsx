"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  DollarSign,
  Gauge,
  PackageCheck,
  Send,
  Star,
  Truck,
  XCircle,
} from "lucide-react";
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
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { StatusPill } from "@/components/primitives/StatusPill";
import { ToastHost, useToastQueue } from "@/components/primitives/ToastHost";
import { ApiResponseError } from "@/lib/api/client";
import * as bidsApi from "@/lib/api/bids";
import type { Bid, CreateBidInput } from "@/lib/api/bids";
import * as loadsApi from "@/lib/api/loads";
import type { Load } from "@/lib/api/loads";
import { getProfile, getUserById, type ProfileResponse } from "@/lib/api/users";

const MIN_PRICE = 1;
const MAX_PRICE = 1_000_000;
const MIN_HOURS = 1;
const MAX_HOURS = 720;

export default function CarrierLoadDetailPage() {
  const params = useParams<{ id: string }>();
  const loadId = params?.id;
  const queryClient = useQueryClient();
  const { toasts, pushToast, dismissToast } = useToastQueue();

  const profileQuery = useQuery({
    queryKey: ["users", "profile"],
    queryFn: getProfile,
  });

  const loadQuery = useQuery({
    queryKey: ["loads", loadId],
    queryFn: () => loadsApi.get(loadId!),
    enabled: Boolean(loadId),
  });

  const myBidsQuery = useQuery({
    queryKey: ["bids", "my"],
    queryFn: bidsApi.listMine,
  });

  const otherBidsQuery = useQuery({
    queryKey: ["bids", "for-load", loadId],
    queryFn: () => bidsApi.listForLoad(loadId!),
    enabled: Boolean(loadId),
    retry: (failureCount, error) => {
      if (error instanceof ApiResponseError && (error.status === 401 || error.status === 403)) {
        return false;
      }
      return failureCount < 1;
    },
  });

  const shipperId = loadQuery.data?.shipperId;
  const shipperQuery = useQuery({
    queryKey: ["users", shipperId ?? "_none"],
    queryFn: () => getUserById(shipperId!),
    enabled: Boolean(shipperId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const carrierProfile = profileQuery.data?.carrierProfile ?? null;
  const isProfileComplete = Boolean(
    carrierProfile?.truckType && carrierProfile?.capacityKg && carrierProfile.capacityKg > 0,
  );

  const myBidForLoad = React.useMemo<Bid | null>(() => {
    if (!loadId) return null;
    const bid = myBidsQuery.data?.find((entry) => entry.loadId === loadId);
    return bid ?? null;
  }, [loadId, myBidsQuery.data]);

  const otherBids = React.useMemo<Bid[]>(() => {
    if (!otherBidsQuery.data) return [];
    return otherBidsQuery.data.filter((bid) => bid._id !== myBidForLoad?._id);
  }, [otherBidsQuery.data, myBidForLoad]);

  const marketAvgEta = React.useMemo(() => {
    if (otherBids.length === 0) return null;
    const total = otherBids.reduce((sum, bid) => sum + bid.estimatedDeliveryHours, 0);
    return total / otherBids.length;
  }, [otherBids]);

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [priceInput, setPriceInput] = React.useState("");
  const [hoursInput, setHoursInput] = React.useState("24");
  const [notes, setNotes] = React.useState("");

  const handleOpenDrawer = React.useCallback(() => {
    if (!isProfileComplete || myBidForLoad) {
      setDrawerOpen(true);
      return;
    }
    const suggestedHours = loadQuery.data?.deadlineHours
      ? Math.max(MIN_HOURS, Math.min(loadQuery.data.deadlineHours, MAX_HOURS))
      : 24;
    setPriceInput("");
    setHoursInput(String(suggestedHours));
    setNotes("");
    setDrawerOpen(true);
  }, [isProfileComplete, loadQuery.data?.deadlineHours, myBidForLoad]);

  const pickupMutation = useMutation({
    mutationFn: () => loadsApi.confirmPickup(loadId!),
    onSuccess: (data) => {
      queryClient.setQueryData(["loads", loadId], data);
      void queryClient.invalidateQueries({ queryKey: ["loads"] });
      pushToast("Pickup confirmed");
    },
    onError: () => {
      pushToast("Could not confirm pickup. Try again.", "error");
    },
  });

  const deliveryMutation = useMutation({
    mutationFn: () => loadsApi.confirmDelivery(loadId!),
    onSuccess: (data) => {
      queryClient.setQueryData(["loads", loadId], data);
      void queryClient.invalidateQueries({ queryKey: ["loads"] });
      pushToast("Delivery confirmed");
    },
    onError: () => {
      pushToast("Could not confirm delivery. Try again.", "error");
    },
  });

  const submitMutation = useMutation({
    mutationFn: (input: CreateBidInput) => bidsApi.create(input),
    onSuccess: (bid) => {
      queryClient.setQueryData<Bid[]>(["bids", "my"], (prev) => {
        const existing = prev ?? [];
        if (existing.some((b) => b._id === bid._id)) return existing;
        return [bid, ...existing];
      });
      void queryClient.invalidateQueries({ queryKey: ["bids"] });
      pushToast("Bid submitted");
      setDrawerOpen(false);
    },
    onError: (error: unknown) => {
      pushToast(messageFromBidError(error), "error");
    },
  });

  if (!loadId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
          Missing load id
        </p>
      </main>
    );
  }

  if (loadQuery.isLoading) {
    return <DetailSkeleton />;
  }

  if (loadQuery.isError || !loadQuery.data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <BackLink />
        <div className="mt-4 rounded-lg border border-[--color-danger]/40 bg-[--color-danger]/10 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-red-200">
            Load unavailable
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {loadQuery.error instanceof Error
              ? loadQuery.error.message
              : "Could not load this listing."}
          </p>
        </div>
      </main>
    );
  }

  const load = loadQuery.data;
  const shipper = shipperQuery.data;
  const shipperDisplay = shipperLabel(shipper, load.shipperId);
  const completed = shipper?.shipperProfile?.completedLoads;

  const priceNumber = Number(priceInput);
  const hoursNumber = Number(hoursInput);
  const priceValid =
    Number.isFinite(priceNumber) && priceNumber >= MIN_PRICE && priceNumber <= MAX_PRICE;
  const hoursValid =
    Number.isFinite(hoursNumber) && hoursNumber >= MIN_HOURS && hoursNumber <= MAX_HOURS;
  const formValid = priceValid && hoursValid;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <BackLink />

      <header className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Load</p>
          <h1
            className="mt-1 text-2xl font-bold text-slate-100 sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {load.title}
          </h1>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
            {load.origin} → {load.destination}
          </p>
        </div>
        <StatusPill status={load.status} />
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-12">
        <section className="space-y-5 lg:col-span-7">
          <div className="overflow-hidden rounded-lg border border-slate-800">
            <RouteMap origin={load.origin} destination={load.destination} height="320px" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FactCard
              icon={<PackageCheck className="h-4 w-4 text-amber-400" aria-hidden="true" />}
              label="Cargo"
              value={load.cargoType}
            />
            <FactCard
              icon={<Truck className="h-4 w-4 text-amber-400" aria-hidden="true" />}
              label="Weight"
              value={<MonoNum value={load.weightKg} unit="kg" />}
            />
            <FactCard
              icon={<Clock3 className="h-4 w-4 text-amber-400" aria-hidden="true" />}
              label="Deadline"
              value={<MonoNum value={load.deadlineHours} unit="h" />}
            />
            <FactCard
              icon={<Gauge className="h-4 w-4 text-amber-400" aria-hidden="true" />}
              label="Bids"
              value={<MonoNum value={otherBids.length + (myBidForLoad ? 1 : 0)} />}
            />
          </div>

          <ShipperPanel shipper={shipper} display={shipperDisplay} completed={completed} />
        </section>

        <aside className="space-y-5 lg:col-span-5">
          <YourBidPanel
            bid={myBidForLoad}
            isProfileComplete={isProfileComplete}
            onPlaceBid={handleOpenDrawer}
            loadStatus={load.status}
            onConfirmPickup={() => pickupMutation.mutate()}
            onConfirmDelivery={() => deliveryMutation.mutate()}
            isPickupPending={pickupMutation.isPending}
            isDeliveryPending={deliveryMutation.isPending}
          />

          {!isProfileComplete ? <ProfileGateCallout /> : null}
        </aside>
      </div>

      <Drawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (submitMutation.isPending) return;
          setDrawerOpen(open);
        }}
      >
        <DrawerContent aria-describedby="bid-drawer-description">
          {!isProfileComplete ? (
            <ProfileGateDrawer />
          ) : myBidForLoad ? (
            <ExistingBidDrawer bid={myBidForLoad} />
          ) : (
            <BidForm
              priceInput={priceInput}
              hoursInput={hoursInput}
              notes={notes}
              priceValid={priceValid}
              hoursValid={hoursValid}
              formValid={formValid}
              isPending={submitMutation.isPending}
              load={load}
              marketAvgEta={marketAvgEta}
              hoursNumber={hoursNumber}
              onPriceChange={setPriceInput}
              onHoursChange={setHoursInput}
              onNotesChange={setNotes}
              onSubmit={() => {
                if (!formValid) return;
                submitMutation.mutate({
                  loadId,
                  priceUSD: priceNumber,
                  estimatedDeliveryHours: hoursNumber,
                });
              }}
              onCancel={() => setDrawerOpen(false)}
            />
          )}
        </DrawerContent>
      </Drawer>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}

function BackLink() {
  return (
    <Link
      href="/marketplace"
      className="fm-focus-ring inline-flex items-center gap-1 rounded font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-amber-300"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      Back to marketplace
    </Link>
  );
}

function FactCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="fm-panel-muted rounded-lg p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
          {label}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-100">{value}</p>
    </div>
  );
}

function ShipperPanel({
  shipper,
  display,
  completed,
}: {
  shipper: ProfileResponse | undefined;
  display: string;
  completed?: number;
}) {
  return (
    <section className="fm-panel-muted rounded-lg p-4">
      <SectionHeader label="Shipper" />
      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-950 font-mono text-sm font-semibold text-amber-300">
          {(display[0] ?? "S").toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">{display}</p>
          <p className="truncate font-mono text-[11px] text-slate-500">
            {shipper?.email ?? "Identity hidden until match"}
          </p>
        </div>
        {completed !== undefined ? (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
            <Star className="h-3 w-3 text-amber-400" aria-hidden="true" />
            <MonoNum value={completed} className="text-slate-200" />
          </span>
        ) : null}
      </div>
    </section>
  );
}

function YourBidPanel({
  bid,
  isProfileComplete,
  onPlaceBid,
  loadStatus,
  onConfirmPickup,
  onConfirmDelivery,
  isPickupPending,
  isDeliveryPending,
}: {
  bid: Bid | null;
  isProfileComplete: boolean;
  onPlaceBid: () => void;
  loadStatus: Load["status"];
  onConfirmPickup?: () => void;
  onConfirmDelivery?: () => void;
  isPickupPending?: boolean;
  isDeliveryPending?: boolean;
}) {
  const acceptingBids = loadStatus === "Posted";

  if (bid) {
    const anyPending = Boolean(isPickupPending || isDeliveryPending);

    return (
      <section className="fm-panel-surface rounded-lg p-5">
        <div className="flex items-center justify-between gap-3">
          <SectionHeader label="Your bid" />
          <StatusPill status={bid.status} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <Fact label="Price">
            <MonoNum value={bid.priceUSD} currency="USD" maximumFractionDigits={0} />
          </Fact>
          <Fact label="Your ETA">
            <MonoNum value={bid.estimatedDeliveryHours} unit="h" />
          </Fact>
        </dl>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          Submitted {bid.createdAt ? formatRelative(bid.createdAt) : "moments ago"}
        </p>
        <div className="mt-5 rounded border border-slate-800 bg-slate-950/40 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Updates
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Editing or withdrawing a bid is coming soon. Reach out to the shipper if anything
            changes.
          </p>
        </div>
        {bid.status === "Accepted" && loadStatus === "Matched" && onConfirmPickup ? (
          <div className="mt-5">
            <Button
              variant="primary"
              className="w-full"
              onClick={onConfirmPickup}
              loading={isPickupPending}
              disabled={anyPending}
            >
              <Truck className="h-3.5 w-3.5" aria-hidden="true" />
              Confirm pickup
            </Button>
          </div>
        ) : null}
        {bid.status === "Accepted" && loadStatus === "InTransit" && onConfirmDelivery ? (
          <div className="mt-5">
            <Button
              variant="primary"
              className="w-full"
              onClick={onConfirmDelivery}
              loading={isDeliveryPending}
              disabled={anyPending}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Confirm delivery
            </Button>
          </div>
        ) : null}
      </section>
    );
  }

  if (!acceptingBids) {
    return (
      <section className="fm-panel-muted rounded-lg p-5">
        <SectionHeader label="Bidding closed" />
        <p className="mt-3 text-sm text-slate-400">This load is no longer accepting new bids.</p>
      </section>
    );
  }

  return (
    <section className="fm-panel-surface rounded-lg p-5">
      <SectionHeader label="Place your bid" />
      <p className="mt-3 text-sm text-slate-300">
        Quote a price and an ETA. Shippers see all open bids and pick the strongest signal.
      </p>
      <div className="mt-5">
        <Button onClick={onPlaceBid} className="w-full">
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          {isProfileComplete ? "Place bid" : "Set up to bid"}
        </Button>
      </div>
    </section>
  );
}

function ProfileGateCallout() {
  return (
    <section className="rounded-lg border border-amber-400/40 bg-amber-400/5 p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-300">
        Profile incomplete
      </p>
      <p className="mt-1 text-sm text-slate-300">
        Add your truck type and capacity before you bid.
      </p>
      <div className="mt-3">
        <Button asChild size="sm" variant="secondary">
          <Link href="/carrier/profile">Open profile</Link>
        </Button>
      </div>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-100">{children}</dd>
    </div>
  );
}

function ProfileGateDrawer() {
  return (
    <>
      <DrawerHeader>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-400">Set up</p>
        <DrawerTitle className="text-xl font-semibold text-slate-100">
          Complete your profile first
        </DrawerTitle>
        <DrawerDescription id="bid-drawer-description" className="text-sm text-slate-400">
          Shippers need to know what truck and capacity you can bring before they can match you.
        </DrawerDescription>
      </DrawerHeader>
      <ul className="mt-5 space-y-3 text-sm text-slate-300">
        <li className="flex items-start gap-2">
          <Truck className="mt-0.5 h-4 w-4 text-amber-400" aria-hidden="true" />
          Set your truck type (flatbed, refrigerated, dry-van, tanker)
        </li>
        <li className="flex items-start gap-2">
          <Gauge className="mt-0.5 h-4 w-4 text-amber-400" aria-hidden="true" />
          Set your capacity in kilograms
        </li>
      </ul>
      <DrawerFooter>
        <DrawerClose asChild>
          <Button variant="ghost">Not now</Button>
        </DrawerClose>
        <Button asChild>
          <Link href="/carrier/profile">Open profile</Link>
        </Button>
      </DrawerFooter>
    </>
  );
}

function ExistingBidDrawer({ bid }: { bid: Bid }) {
  return (
    <>
      <DrawerHeader>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-400">Your bid</p>
        <DrawerTitle className="text-xl font-semibold text-slate-100">
          You already bid on this load
        </DrawerTitle>
        <DrawerDescription id="bid-drawer-description" className="text-sm text-slate-400">
          Shippers see your bid in their inbox. Editing and withdrawing aren&apos;t available yet.
        </DrawerDescription>
      </DrawerHeader>
      <dl className="mt-5 grid grid-cols-2 gap-3">
        <Fact label="Price">
          <MonoNum value={bid.priceUSD} currency="USD" maximumFractionDigits={0} />
        </Fact>
        <Fact label="Your ETA">
          <MonoNum value={bid.estimatedDeliveryHours} unit="h" />
        </Fact>
        <Fact label="Status">
          <StatusPill status={bid.status} />
        </Fact>
        <Fact label="Submitted">
          <span className="font-mono text-xs text-slate-300">
            {bid.createdAt ? formatRelative(bid.createdAt) : "moments ago"}
          </span>
        </Fact>
      </dl>
      <DrawerFooter>
        <DrawerClose asChild>
          <Button>Got it</Button>
        </DrawerClose>
      </DrawerFooter>
    </>
  );
}

function BidForm({
  priceInput,
  hoursInput,
  notes,
  priceValid,
  hoursValid,
  formValid,
  isPending,
  load,
  marketAvgEta,
  hoursNumber,
  onPriceChange,
  onHoursChange,
  onNotesChange,
  onSubmit,
  onCancel,
}: {
  priceInput: string;
  hoursInput: string;
  notes: string;
  priceValid: boolean;
  hoursValid: boolean;
  formValid: boolean;
  isPending: boolean;
  load: Load;
  marketAvgEta: number | null;
  hoursNumber: number;
  onPriceChange: (next: string) => void;
  onHoursChange: (next: string) => void;
  onNotesChange: (next: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const confidence = computeConfidence({
    proposedHours: hoursNumber,
    deadlineHours: load.deadlineHours,
    marketAvgEta,
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <DrawerHeader>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-400">Place bid</p>
        <DrawerTitle className="text-xl font-semibold text-slate-100">{load.title}</DrawerTitle>
        <DrawerDescription
          id="bid-drawer-description"
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500"
        >
          {load.origin} → {load.destination}
        </DrawerDescription>
      </DrawerHeader>

      <div className="mt-5 space-y-5">
        <div>
          <label
            htmlFor="bid-price"
            className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"
          >
            Price USD
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-amber-400"
            >
              <DollarSign className="h-3.5 w-3.5" />
            </span>
            <Input
              id="bid-price"
              inputMode="numeric"
              className="pl-9 font-mono tabular-nums"
              value={priceInput}
              onChange={(event) => onPriceChange(event.target.value.replace(/[^\d]/g, ""))}
              placeholder="2500"
              error={
                priceInput && !priceValid
                  ? `Enter a price between ${MIN_PRICE} and ${MAX_PRICE}`
                  : undefined
              }
              disabled={isPending}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="bid-hours"
            className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"
          >
            <span>Estimated delivery</span>
            <span className="text-amber-300">
              <MonoNum value={hoursValid ? hoursNumber : 0} unit="h" />
            </span>
          </label>
          <input
            id="bid-hours"
            type="range"
            min={MIN_HOURS}
            max={Math.max(MIN_HOURS, Math.min(MAX_HOURS, load.deadlineHours * 2 || MAX_HOURS))}
            step={1}
            value={hoursValid ? hoursNumber : MIN_HOURS}
            onChange={(event) => onHoursChange(event.target.value)}
            disabled={isPending}
            className="fm-focus-ring h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-amber-400"
          />
          <div className="mt-2 flex items-center gap-2">
            <Input
              inputMode="numeric"
              className="w-24 font-mono tabular-nums"
              value={hoursInput}
              onChange={(event) => onHoursChange(event.target.value.replace(/[^\d]/g, ""))}
              error={
                hoursInput && !hoursValid ? `Enter ${MIN_HOURS}–${MAX_HOURS} hours` : undefined
              }
              disabled={isPending}
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
              vs deadline · {load.deadlineHours}h
            </span>
          </div>
        </div>

        <ConfidenceIndicator confidence={confidence} />

        <div>
          <label
            htmlFor="bid-notes"
            className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"
          >
            Notes (optional)
          </label>
          <textarea
            id="bid-notes"
            value={notes}
            onChange={(event) => onNotesChange(event.target.value.slice(0, 500))}
            disabled={isPending}
            rows={3}
            className="fm-focus-ring w-full resize-y rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-sm text-slate-200 placeholder:text-slate-600 disabled:opacity-60"
            placeholder="Any specifics shippers should know."
          />
          <p className="mt-1 text-right font-mono text-[10px] text-slate-500">
            {notes.length} / 500
          </p>
        </div>
      </div>

      <DrawerFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={isPending} disabled={!formValid || isPending}>
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          Submit bid
        </Button>
      </DrawerFooter>
    </form>
  );
}

type Confidence =
  | { tone: "strong"; label: string; detail: string }
  | { tone: "neutral"; label: string; detail: string }
  | { tone: "weak"; label: string; detail: string };

function computeConfidence({
  proposedHours,
  deadlineHours,
  marketAvgEta,
}: {
  proposedHours: number;
  deadlineHours: number;
  marketAvgEta: number | null;
}): Confidence {
  if (!Number.isFinite(proposedHours) || proposedHours <= 0) {
    return {
      tone: "neutral",
      label: "Set an ETA",
      detail: "Pick an estimate to see how it ranks.",
    };
  }
  if (proposedHours > deadlineHours) {
    return {
      tone: "weak",
      label: `Past deadline by ${proposedHours - deadlineHours}h`,
      detail: "Shippers usually filter out late ETAs.",
    };
  }
  const baseline = marketAvgEta ?? deadlineHours * 0.85;
  if (baseline <= 0) {
    return {
      tone: "neutral",
      label: "ETA looks reasonable",
      detail: "No market data yet — first bid sets the bar.",
    };
  }
  const diff = (baseline - proposedHours) / baseline;
  const pct = Math.round(diff * 100);
  if (pct >= 5) {
    return {
      tone: "strong",
      label: `Your ETA is ${pct}% better than the market average`,
      detail: `Market avg sits at ~${Math.round(baseline)}h.`,
    };
  }
  if (pct <= -5) {
    return {
      tone: "weak",
      label: `Your ETA is ${Math.abs(pct)}% slower than market average`,
      detail: `Market avg sits at ~${Math.round(baseline)}h.`,
    };
  }
  return {
    tone: "neutral",
    label: "Right around the market average",
    detail: `Market avg sits at ~${Math.round(baseline)}h.`,
  };
}

function ConfidenceIndicator({ confidence }: { confidence: Confidence }) {
  const palette =
    confidence.tone === "strong"
      ? "border-[--color-go]/40 bg-[--color-go]/5 text-[--color-go]"
      : confidence.tone === "weak"
        ? "border-[--color-danger]/40 bg-[--color-danger]/5 text-red-200"
        : "border-slate-800 bg-slate-950/40 text-slate-300";

  const Icon =
    confidence.tone === "strong" ? CheckCircle2 : confidence.tone === "weak" ? XCircle : Gauge;

  return (
    <div className={`flex items-start gap-3 rounded-md border p-3 ${palette}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{confidence.label}</p>
        <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-slate-400">
          {confidence.detail}
        </p>
      </div>
    </div>
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

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "moments ago";
  const diffMs = Date.now() - ts;
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return new Date(iso).toLocaleDateString();
}

function messageFromBidError(error: unknown): string {
  if (error instanceof ApiResponseError) {
    if (error.status === 409) return "You already have a bid on this load.";
    if (error.status === 403) return "Bidding requires a complete carrier profile.";
    if (error.status === 401) return "Please sign in again to submit a bid.";
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Could not submit bid. Try again.";
}

function DetailSkeleton() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-3 w-32 animate-pulse rounded bg-slate-800" />
      <div className="mt-4 h-8 w-2/3 animate-pulse rounded bg-slate-800" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-800/70" />
      <div className="mt-6 grid gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          <div className="h-[320px] animate-pulse rounded-lg bg-slate-900/40" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-[88px] animate-pulse rounded-lg bg-slate-900/40" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="h-[260px] animate-pulse rounded-lg bg-slate-900/40" />
        </div>
      </div>
    </main>
  );
}
