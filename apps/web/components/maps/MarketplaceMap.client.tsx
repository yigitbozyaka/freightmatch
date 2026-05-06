"use client";

import * as React from "react";
import L, { type LatLngTuple } from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { Load } from "@/lib/api/loads";
import type { MarketplaceMapProps } from "./MarketplaceMap";
import { RouteMapAsciiFallback, RouteMapFrame, RouteMapLoadingShell } from "./route-map-ui";

type Coordinates = { lat: number; lng: number };

type ResolvedPin = {
  load: Load;
  position: LatLngTuple;
};

const CARTO_DARK_MATTER_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const geocodeCache = new Map<string, Promise<Coordinates | null>>();

function buildPinIcon(selected: boolean): L.DivIcon {
  const size = selected ? 18 : 14;
  const ring = selected ? 28 : 22;
  return L.divIcon({
    className: "fm-marketplace-pin",
    html: `<span class="fm-marketplace-pin-dot" style="width:${size}px;height:${size}px"></span><span class="fm-marketplace-pin-ring" style="width:${ring}px;height:${ring}px"></span>`,
    iconSize: [ring, ring],
    iconAnchor: [ring / 2, ring / 2],
  });
}

export default function MarketplaceMapClient({
  height = "480px",
  loads,
  onPinClick,
  selectedId,
}: MarketplaceMapProps) {
  const [resolved, setResolved] = React.useState<ResolvedPin[] | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "fallback">("loading");

  const loadKey = React.useMemo(
    () => loads.map((load) => `${load._id}:${load.origin}`).join("|"),
    [loads],
  );

  React.useEffect(() => {
    if (loads.length === 0) {
      setResolved([]);
      setStatus("ready");
      return;
    }

    let active = true;
    setStatus("loading");

    void Promise.all(
      loads.map(async (load) => {
        const origin = await geocodeLocation(load.origin);
        if (!origin) return null;
        return {
          load,
          position: [origin.lat, origin.lng] as LatLngTuple,
        } satisfies ResolvedPin;
      }),
    ).then((items) => {
      if (!active) return;
      const ready = items.filter((item): item is ResolvedPin => item !== null);
      if (ready.length === 0) {
        setStatus("fallback");
        setResolved([]);
        return;
      }
      setResolved(ready);
      setStatus("ready");
    });

    return () => {
      active = false;
    };
  }, [loadKey, loads]);

  if (status === "loading") {
    return <RouteMapLoadingShell height={height} label="Plotting available loads" />;
  }

  if (status === "fallback") {
    return (
      <RouteMapAsciiFallback
        destination="loads"
        height={height}
        origin={`${loads.length} available`}
      />
    );
  }

  const pins = resolved ?? [];
  const positions = pins.map((pin) => pin.position);
  const bounds = positions.length > 0 ? L.latLngBounds(positions) : null;
  const center: LatLngTuple = positions[0] ?? [39.8283, -98.5795];

  return (
    <RouteMapFrame height={height}>
      <MapContainer
        attributionControl={false}
        center={center}
        className="h-full w-full"
        scrollWheelZoom
        zoom={4}
        zoomControl
      >
        <TileLayer attribution={CARTO_ATTRIBUTION} subdomains="abcd" url={CARTO_DARK_MATTER_URL} />
        {bounds ? <FitToBounds bounds={bounds} /> : null}
        {pins.map((pin) => {
          const isSelected = pin.load._id === selectedId;
          return (
            <Marker
              key={pin.load._id}
              icon={buildPinIcon(isSelected)}
              position={pin.position}
              eventHandlers={{
                click: () => onPinClick?.(pin.load._id),
              }}
            />
          );
        })}
      </MapContainer>
      <PinCount count={pins.length} total={loads.length} />
    </RouteMapFrame>
  );
}

function FitToBounds({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  const key = bounds.toBBoxString();

  React.useEffect(() => {
    map.fitBounds(bounds, {
      animate: false,
      paddingTopLeft: [32, 32],
      paddingBottomRight: [32, 64],
      maxZoom: 7,
    });
    map.invalidateSize(false);
  }, [bounds, key, map]);

  return null;
}

function PinCount({ count, total }: { count: number; total: number }) {
  const missing = total - count;
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-md border border-slate-700/80 bg-slate-950/82 px-3 py-2 backdrop-blur-sm">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">
        <span className="text-amber-400">{count}</span> plotted
        {missing > 0 ? <span className="text-slate-500"> · {missing} unmapped</span> : null}
      </p>
    </div>
  );
}

async function geocodeLocation(value: string): Promise<Coordinates | null> {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  const cached = geocodeCache.get(normalized);
  if (cached) return cached;

  const request = fetch(
    `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
      q: value.trim(),
      format: "jsonv2",
      limit: "1",
    }).toString()}`,
    { headers: { Accept: "application/json" } },
  )
    .then(async (response) => {
      if (!response.ok) return null;
      const payload: unknown = await response.json();
      if (!Array.isArray(payload) || payload.length === 0) return null;
      const [first] = payload;
      if (!first || typeof first !== "object") return null;
      const lat = Number.parseFloat(String((first as { lat?: unknown }).lat ?? ""));
      const lon = Number.parseFloat(String((first as { lon?: unknown }).lon ?? ""));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lng: lon };
    })
    .catch(() => null);

  geocodeCache.set(normalized, request);
  return request;
}
