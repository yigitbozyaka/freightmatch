"use client";

import * as React from "react";
import L, { type LatLngTuple, type Polyline as LeafletPolyline } from "leaflet";
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from "react-leaflet";
import { cn } from "@/lib/ui/cn";
import type { RouteMapProps } from "./RouteMap";
import {
  RouteMapAsciiFallback,
  RouteMapFrame,
  RouteMapLaneLegend,
  RouteMapLoadingShell,
} from "./route-map-ui";

type Coordinates = {
  lat: number;
  lng: number;
};

type ResolvedRoute =
  | {
      status: "loading";
    }
  | {
      status: "fallback";
    }
  | {
      status: "ready";
      origin: Coordinates;
      destination: Coordinates;
    };

type MarkerKind = "origin" | "destination";

const CARTO_DARK_MATTER_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const geocodeCache = new Map<string, Promise<Coordinates | null>>();

const ORIGIN_ICON = createRouteMarkerIcon("origin");
const DESTINATION_ICON = createRouteMarkerIcon("destination");

export default function RouteMapClient({
  destination,
  height = "220px",
  interactive = false,
  origin,
  showCredits = false,
}: RouteMapProps) {
  const [route, setRoute] = React.useState<ResolvedRoute>({ status: "loading" });
  const prefersReducedMotion = usePrefersReducedMotion();
  const originKey = React.useMemo(() => normalizeLocation(origin), [origin]);
  const destinationKey = React.useMemo(() => normalizeLocation(destination), [destination]);

  React.useEffect(() => {
    if (!originKey || !destinationKey) {
      setRoute({ status: "fallback" });
      return;
    }

    let active = true;
    setRoute({ status: "loading" });

    void Promise.all([geocodeLocation(origin), geocodeLocation(destination)]).then(
      ([originCoordinates, destinationCoordinates]) => {
        if (!active) return;

        if (!originCoordinates || !destinationCoordinates) {
          setRoute({ status: "fallback" });
          return;
        }

        setRoute({
          status: "ready",
          origin: originCoordinates,
          destination: destinationCoordinates,
        });
      },
    );

    return () => {
      active = false;
    };
  }, [destination, destinationKey, origin, originKey]);

  if (route.status === "loading") {
    return <RouteMapLoadingShell destination={destination} height={height} origin={origin} />;
  }

  if (route.status === "fallback") {
    return <RouteMapAsciiFallback destination={destination} height={height} origin={origin} />;
  }

  const geometry = buildRouteGeometry(route.origin, route.destination);

  return (
    <RouteMapFrame height={height}>
      <MapContainer
        attributionControl
        boxZoom={interactive}
        center={geometry.positions[0]}
        className={cn("h-full w-full", !interactive && "pointer-events-none")}
        doubleClickZoom={interactive}
        dragging={interactive}
        keyboard={interactive}
        scrollWheelZoom={interactive}
        touchZoom={interactive}
        zoom={5}
        zoomControl={false}
      >
        <TileLayer attribution={CARTO_ATTRIBUTION} subdomains="abcd" url={CARTO_DARK_MATTER_URL} />
        <AttributionVisibility visible={showCredits} />
        <FitRouteBounds laneKey={geometry.laneKey} positions={geometry.positions} />
        <AnimatedPolyline
          laneKey={geometry.laneKey}
          positions={geometry.positions}
          reducedMotion={prefersReducedMotion}
        />
        <RouteMarker
          icon={ORIGIN_ICON}
          interactive={interactive}
          kind="origin"
          label={origin}
          position={geometry.positions[0]}
        />
        <RouteMarker
          icon={DESTINATION_ICON}
          interactive={interactive}
          kind="destination"
          label={destination}
          position={geometry.positions[1]}
        />
      </MapContainer>

      <RouteMapLaneLegend destination={destination} origin={origin} />
    </RouteMapFrame>
  );
}

function RouteMarker({
  icon,
  interactive,
  kind,
  label,
  position,
}: {
  icon: L.DivIcon;
  interactive: boolean;
  kind: MarkerKind;
  label: string;
  position: LatLngTuple;
}) {
  return (
    <Marker icon={icon} position={position}>
      {interactive ? (
        <Popup autoPan closeButton={false} offset={[0, -12]}>
          <div className="font-mono">
            <p className="text-[10px] uppercase tracking-[0.22em] text-amber-400">
              {kind === "origin" ? "Origin" : "Destination"}
            </p>
            <p className="mt-1 text-xs text-slate-100">{label}</p>
          </div>
        </Popup>
      ) : null}
    </Marker>
  );
}

function FitRouteBounds({
  laneKey,
  positions,
}: {
  laneKey: string;
  positions: [LatLngTuple, LatLngTuple];
}) {
  const map = useMap();

  React.useEffect(() => {
    map.fitBounds(L.latLngBounds(positions), {
      animate: false,
      paddingTopLeft: [24, 24],
      paddingBottomRight: [24, 92],
    });
    map.invalidateSize(false);
  }, [laneKey, map, positions]);

  return null;
}

function AttributionVisibility({ visible }: { visible: boolean }) {
  const map = useMap();

  React.useLayoutEffect(() => {
    const attributionControl = map.attributionControl as
      | (L.Control.Attribution & {
          _map?: L.Map | null;
        })
      | null;

    if (!attributionControl) return;

    if (visible) {
      if (!attributionControl._map) {
        attributionControl.addTo(map);
      }
      return;
    }

    if (attributionControl._map) {
      attributionControl.remove();
    }
  }, [map, visible]);

  return null;
}

function AnimatedPolyline({
  laneKey,
  positions,
  reducedMotion,
}: {
  laneKey: string;
  positions: [LatLngTuple, LatLngTuple];
  reducedMotion: boolean;
}) {
  const polylineRef = React.useRef<LeafletPolyline | null>(null);

  React.useEffect(() => {
    const path = polylineRef.current?.getElement() as SVGPathElement | undefined;
    if (!path) return;

    const renderSolidPath = () => {
      path.classList.remove("fm-route-path--animate");
      path.style.strokeDasharray = "none";
      path.style.strokeDashoffset = "0";
    };

    path.style.setProperty("--fm-route-path-length", `${path.getTotalLength()}`);

    if (reducedMotion) {
      renderSolidPath();
      return;
    }

    const handleAnimationEnd = () => {
      renderSolidPath();
    };

    path.style.removeProperty("stroke-dasharray");
    path.style.removeProperty("stroke-dashoffset");
    path.removeEventListener("animationend", handleAnimationEnd);
    void path.getBoundingClientRect();
    path.addEventListener("animationend", handleAnimationEnd, { once: true });
    path.classList.add("fm-route-path--animate");

    return () => {
      path.removeEventListener("animationend", handleAnimationEnd);
      renderSolidPath();
    };
  }, [laneKey, reducedMotion]);

  return (
    <Polyline
      className="fm-route-path"
      pathOptions={{ color: "#F5B342", interactive: false, opacity: 0.98, weight: 2 }}
      positions={positions}
      ref={polylineRef}
    />
  );
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

function buildRouteGeometry(origin: Coordinates, destination: Coordinates) {
  const samePoint =
    Math.abs(origin.lat - destination.lat) < 0.0005 &&
    Math.abs(origin.lng - destination.lng) < 0.0005;

  const positions: [LatLngTuple, LatLngTuple] = samePoint
    ? buildSyntheticCorridor(origin)
    : [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ];

  return {
    laneKey: positions.map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`).join("|"),
    positions,
  };
}

function buildSyntheticCorridor(point: Coordinates): [LatLngTuple, LatLngTuple] {
  const longitudeOffset = 0.18 / Math.max(Math.cos((point.lat * Math.PI) / 180), 0.35);

  return [
    [point.lat, point.lng - longitudeOffset],
    [point.lat, point.lng + longitudeOffset],
  ];
}

function normalizeLocation(value: string) {
  return value.trim().toLowerCase();
}

async function geocodeLocation(value: string): Promise<Coordinates | null> {
  const normalizedValue = normalizeLocation(value);
  if (!normalizedValue) return null;

  const cachedPromise = geocodeCache.get(normalizedValue);
  if (cachedPromise) return cachedPromise;

  const request = fetch(buildNominatimUrl(value), {
    headers: {
      Accept: "application/json",
    },
  })
    .then(async (response) => {
      if (!response.ok) return null;

      const payload: unknown = await response.json();
      if (!Array.isArray(payload) || payload.length === 0) return null;

      const [result] = payload;
      if (!result || typeof result !== "object") return null;

      const lat = Number.parseFloat(String((result as { lat?: unknown }).lat ?? ""));
      const lon = Number.parseFloat(String((result as { lon?: unknown }).lon ?? ""));

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

      return { lat, lng: lon };
    })
    .catch(() => null);

  geocodeCache.set(normalizedValue, request);
  return request;
}

function buildNominatimUrl(value: string) {
  const query = new URLSearchParams({
    q: value.trim(),
    format: "jsonv2",
    limit: "1",
  });

  return `https://nominatim.openstreetmap.org/search?${query.toString()}`;
}

function createRouteMarkerIcon(kind: MarkerKind) {
  const svg =
    kind === "origin"
      ? `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="2" width="14" height="14" rx="2" fill="#F5B342" stroke="#121820" stroke-width="2" />
        </svg>
      `
      : `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="2" width="14" height="14" rx="2" fill="#121820" stroke="#F5B342" stroke-width="2" />
        </svg>
      `;

  return L.divIcon({
    className: "fm-route-marker",
    html: svg,
    iconAnchor: [9, 9],
    iconSize: [18, 18],
    popupAnchor: [0, -12],
  });
}
