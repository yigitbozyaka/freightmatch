"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import type { LoadStatus } from "@/lib/api/loads";
import { RouteMapLoadingShell } from "./route-map-ui";

export type ActiveRoute = {
  id: string;
  origin: string;
  destination: string;
  status: LoadStatus;
};

export type ActiveRoutesMapProps = {
  routes: ActiveRoute[];
  height?: string;
};

const ActiveRoutesMapClient = dynamic(() => import("./ActiveRoutesMap.client"), {
  ssr: false,
  loading: () => <RouteMapLoadingShell height="var(--fm-route-map-height, 360px)" />,
});

export function ActiveRoutesMap({ height = "360px", routes }: ActiveRoutesMapProps) {
  const style = {
    "--fm-route-map-height": height,
  } as CSSProperties & { "--fm-route-map-height": string };

  return (
    <div style={style}>
      <ActiveRoutesMapClient height={height} routes={routes} />
    </div>
  );
}
