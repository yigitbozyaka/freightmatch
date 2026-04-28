"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import { RouteMapLoadingShell } from "./route-map-ui";

export type RouteMapProps = {
  origin: string;
  destination: string;
  interactive?: boolean;
  height?: string;
  showCredits?: boolean;
};

const RouteMapClient = dynamic(() => import("./RouteMap.client"), {
  ssr: false,
  loading: () => <RouteMapLoadingShell height="var(--fm-route-map-height, 220px)" />,
});

export function RouteMap({
  destination,
  height = "220px",
  interactive = false,
  origin,
  showCredits = false,
}: RouteMapProps) {
  const style = {
    "--fm-route-map-height": height,
  } as CSSProperties & { "--fm-route-map-height": string };

  return (
    <div style={style}>
      <RouteMapClient
        destination={destination}
        height={height}
        interactive={interactive}
        origin={origin}
        showCredits={showCredits}
      />
    </div>
  );
}
