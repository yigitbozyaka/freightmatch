import { NextResponse } from "next/server";

const SERVICES = [
  {
    id: "user-service",
    name: "User Service",
    url: process.env.USER_SERVICE_URL ?? "http://user-service:3001",
  },
  {
    id: "load-service",
    name: "Load Service",
    url: process.env.LOAD_SERVICE_URL ?? "http://load-service:3002",
  },
  {
    id: "bidding-service",
    name: "Bidding Service",
    url: process.env.BIDDING_SERVICE_URL ?? "http://bidding-service:3003",
  },
  {
    id: "matching-service",
    name: "Matching & AI",
    url: process.env.MATCHING_SERVICE_URL ?? "http://matching-service:3004",
  },
];

type HealthStatus = "healthy" | "unhealthy" | "degraded" | "down";

interface ServiceResult {
  id: string;
  name: string;
  status: HealthStatus;
  latency: number;
  uptime?: number;
  version?: string;
  checks: {
    mongodb?: { status: HealthStatus; message?: string };
    memory?: { status: HealthStatus; message?: string };
  };
}

export async function GET() {
  const results = await Promise.all(
    SERVICES.map(async (svc): Promise<ServiceResult> => {
      const start = Date.now();
      try {
        const res = await fetch(`${svc.url}/health`, {
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        });
        const latency = Date.now() - start;
        const data = await res.json();
        return {
          id: svc.id,
          name: svc.name,
          status: res.ok || res.status === 503 ? (data.status as HealthStatus) : "down",
          latency,
          uptime: data.uptime,
          version: data.version,
          checks: data.checks ?? {},
        };
      } catch {
        return {
          id: svc.id,
          name: svc.name,
          status: "down",
          latency: Date.now() - start,
          checks: {},
        };
      }
    }),
  );

  const overall = results.some((r) => r.status === "down" || r.status === "unhealthy")
    ? "outage"
    : results.some((r) => r.status === "degraded")
      ? "degraded"
      : "operational";

  return NextResponse.json(
    { overall, services: results, timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store, no-cache" } },
  );
}
