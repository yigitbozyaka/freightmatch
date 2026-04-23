import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

type RouteMapFrameProps = {
  children: ReactNode;
  className?: string;
  height: string;
};

type RouteMapLegendProps = {
  origin: string;
  destination: string;
};

type RouteMapLoadingShellProps = {
  height: string;
  origin?: string;
  destination?: string;
  label?: string;
};

type RouteMapAsciiFallbackProps = {
  origin: string;
  destination: string;
  height: string;
};

export function RouteMapFrame({ children, className, height }: RouteMapFrameProps) {
  return (
    <div
      className={cn(
        "fm-panel-surface fm-route-map relative isolate overflow-hidden rounded-xl",
        className,
      )}
      style={{ height }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,179,66,0.12),transparent_44%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,14,18,0.08),rgba(10,14,18,0.4))]" />
      {children}
    </div>
  );
}

export function RouteMapLaneLegend({ destination, origin }: RouteMapLegendProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] p-3 sm:p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
        <LegendCard align="left" label="Origin" value={origin} />
        <LegendCard align="right" label="Destination" value={destination} />
      </div>
    </div>
  );
}

export function RouteMapLoadingShell({
  destination,
  height,
  label = "Plotting corridor",
  origin,
}: RouteMapLoadingShellProps) {
  return (
    <RouteMapFrame height={height}>
      <div className="relative flex h-full items-center justify-center px-6 pb-20 pt-6">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-3.5 w-3.5 rounded-[2px] border border-amber-400 bg-amber-400/85 shadow-[0_0_16px_rgba(245,179,66,0.24)]" />
          <div className="space-y-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber-400/90">
              RouteMap
            </p>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
          </div>
        </div>
      </div>

      {origin && destination ? (
        <RouteMapLaneLegend destination={destination} origin={origin} />
      ) : null}
    </RouteMapFrame>
  );
}

export function RouteMapAsciiFallback({ destination, height, origin }: RouteMapAsciiFallbackProps) {
  return (
    <RouteMapFrame height={height}>
      <div className="relative flex h-full items-center justify-center px-6 pb-20 pt-6">
        <div className="rounded-xl border border-amber-400/12 bg-slate-950/55 px-6 py-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-400/90">
            fallback corridor
          </p>
          <p className="mt-3 font-mono text-2xl tracking-[0.24em] text-amber-400 sm:text-3xl">
            ┌──▸──┐
          </p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            routing data unavailable
          </p>
        </div>
      </div>

      <RouteMapLaneLegend destination={destination} origin={origin} />
    </RouteMapFrame>
  );
}

function LegendCard({
  align,
  label,
  value,
}: {
  align: "left" | "right";
  label: string;
  value: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-700/80 bg-slate-950/82 px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur-sm",
        align === "right" && "sm:text-right",
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400/80">{label}</p>
      <p className="mt-1 font-mono text-[11px] leading-4 text-slate-100 break-words">{value}</p>
    </div>
  );
}
