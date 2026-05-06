"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import type { Load } from "@/lib/api/loads";
import { RouteMapLoadingShell } from "./route-map-ui";

export type MarketplaceMapProps = {
  loads: Load[];
  selectedId?: string | null;
  onPinClick?: (loadId: string) => void;
  height?: string;
};

const MarketplaceMapClient = dynamic(() => import("./MarketplaceMap.client"), {
  ssr: false,
  loading: () => <RouteMapLoadingShell height="var(--fm-route-map-height, 480px)" />,
});

export function MarketplaceMap({
  height = "480px",
  loads,
  onPinClick,
  selectedId,
}: MarketplaceMapProps) {
  const style = {
    "--fm-route-map-height": height,
  } as CSSProperties & { "--fm-route-map-height": string };

  return (
    <div style={style}>
      <MarketplaceMapClient
        height={height}
        loads={loads}
        onPinClick={onPinClick}
        selectedId={selectedId}
      />
    </div>
  );
}
