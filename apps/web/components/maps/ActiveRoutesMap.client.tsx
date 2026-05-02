"use client";

import * as React from "react";
import L, { type LatLngTuple } from "leaflet";
import { MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import type { LoadStatus } from "@/lib/api/loads";
import type { ActiveRoute, ActiveRoutesMapProps } from "./ActiveRoutesMap";
import { RouteMapAsciiFallback, RouteMapFrame, RouteMapLoadingShell } from "./route-map-ui";

type Coordinates = { lat: number; lng: number };

type ResolvedRoute = ActiveRoute & {
  positions: [LatLngTuple, LatLngTuple];
};

const CARTO_DARK_MATTER_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const STATUS_COLORS: Record<LoadStatus, string> = {
  Draft: "#94A3B8",
  Posted: "#F5B342",
  Matched: "#5BA9F2",
  InTransit: "#5BA9F2",
  Delivered: "#3DD68C",
  Cancelled: "#E0556B",
};

const geocodeCache = new Map<string, Promise<Coordinates | null>>();

export default function ActiveRoutesMapClient({ height = "360px", routes }: ActiveRoutesMapProps) {
  const [resolved, setResolved] = React.useState<ResolvedRoute[] | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "fallback">("loading");

  const routeKey = React.useMemo(
    () => routes.map((r) => `${r.id}:${r.origin}->${r.destination}:${r.status}`).join("|"),
    [routes],
  );

  React.useEffect(() => {
    if (routes.length === 0) {
      setResolved([]);
      setStatus("ready");
      return;
    }

    let active = true;
    setStatus("loading");

    void Promise.all(
      routes.map(async (route) => {
        const [origin, destination] = await Promise.all([
          geocodeLocation(route.origin),
          geocodeLocation(route.destination),
        ]);
        if (!origin || !destination) return null;
        return {
          ...route,
          positions: [
            [origin.lat, origin.lng],
            [destination.lat, destination.lng],
          ] as [LatLngTuple, LatLngTuple],
        } satisfies ResolvedRoute;
      }),
    ).then((items) => {
      if (!active) return;
      const ready = items.filter((item): item is ResolvedRoute => item !== null);
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
  }, [routeKey, routes]);

  if (status === "loading") {
    return <RouteMapLoadingShell height={height} label="Plotting active lanes" />;
  }

  if (status === "fallback") {
    return (
      <RouteMapAsciiFallback destination="active lanes" height={height} origin="multiple lanes" />
    );
  }

  const allPositions = (resolved ?? []).flatMap((r) => r.positions);
  const bounds = allPositions.length > 0 ? L.latLngBounds(allPositions) : null;
  const center: LatLngTuple = allPositions[0] ?? [39.8283, -98.5795];

  return (
    <RouteMapFrame height={height}>
      <MapContainer
        attributionControl={false}
        center={center}
        className="h-full w-full"
        scrollWheelZoom={false}
        zoom={4}
        zoomControl={false}
      >
        <TileLayer attribution={CARTO_ATTRIBUTION} subdomains="abcd" url={CARTO_DARK_MATTER_URL} />
        {bounds ? <FitToBounds bounds={bounds} /> : null}
        {(resolved ?? []).map((route) => (
          <Polyline
            key={route.id}
            pathOptions={{
              color: STATUS_COLORS[route.status] ?? "#F5B342",
              opacity: 0.85,
              weight: 2.5,
              interactive: false,
            }}
            positions={route.positions}
          />
        ))}
      </MapContainer>
      <Legend />
    </RouteMapFrame>
  );
}

function FitToBounds({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  const key = bounds.toBBoxString();

  React.useEffect(() => {
    map.fitBounds(bounds, {
      animate: false,
      paddingTopLeft: [24, 24],
      paddingBottomRight: [24, 56],
    });
    map.invalidateSize(false);
  }, [bounds, key, map]);

  return null;
}

function Legend() {
  const items: Array<{ label: string; color: string }> = [
    { label: "Posted", color: STATUS_COLORS.Posted },
    { label: "Matched", color: STATUS_COLORS.Matched },
    { label: "In transit", color: STATUS_COLORS.InTransit },
  ];
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex gap-2 rounded-md border border-slate-700/80 bg-slate-950/82 px-3 py-2 backdrop-blur-sm">
      {items.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300"
        >
          <span
            className="inline-block h-[2px] w-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
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
