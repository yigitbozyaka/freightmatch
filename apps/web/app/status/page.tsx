"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  Cpu,
  Database,
  Gavel,
  Package,
  RefreshCw,
  Users,
  XCircle,
  AlertTriangle,
} from "lucide-react";

type HealthStatus = "healthy" | "unhealthy" | "degraded" | "down";
type OverallStatus = "operational" | "degraded" | "outage";

interface ServiceStatus {
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

interface StatusResponse {
  overall: OverallStatus;
  services: ServiceStatus[];
  timestamp: string;
}

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  "user-service": <Users className="h-4 w-4" />,
  "load-service": <Package className="h-4 w-4" />,
  "bidding-service": <Gavel className="h-4 w-4" />,
  "matching-service": <Bot className="h-4 w-4" />,
};

const STATUS_HEX: Record<HealthStatus | OverallStatus, string> = {
  healthy: "#3dd68c",
  operational: "#3dd68c",
  degraded: "#f5b342",
  unhealthy: "#e5484d",
  down: "#e5484d",
  outage: "#e5484d",
};

function formatUptime(seconds?: number): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

function formatAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

function StatusDot({ status }: { status: HealthStatus }) {
  const color = STATUS_HEX[status];
  const pulse = status === "healthy";
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {pulse && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ background: color }}
        />
      )}
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
    </span>
  );
}

function StatusPill({ status }: { status: HealthStatus }) {
  const labels: Record<HealthStatus, string> = {
    healthy: "Operational",
    degraded: "Degraded",
    unhealthy: "Unhealthy",
    down: "Down",
  };
  const color = STATUS_HEX[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: `${color}1a`, color }}
    >
      <StatusDot status={status} />
      {labels[status]}
    </span>
  );
}

function OverallBanner({ status }: { status: OverallStatus }) {
  const copy: Record<OverallStatus, string> = {
    operational: "All Systems Operational",
    degraded: "Partial System Degradation",
    outage: "Service Disruption Detected",
  };
  const color = STATUS_HEX[status];
  const Icon =
    status === "operational" ? CheckCircle2 : status === "degraded" ? AlertTriangle : XCircle;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-6 py-5"
      style={{ background: `${color}0f`, borderColor: `${color}2e` }}
    >
      <Icon className="h-6 w-6 shrink-0" style={{ color }} />
      <span className="text-lg font-semibold text-slate-100">{copy[status]}</span>
    </div>
  );
}

function SkeletonBanner() {
  return (
    <div
      className="h-[68px] animate-pulse rounded-xl border"
      style={{ background: "#121820", borderColor: "rgba(255,255,255,0.06)" }}
    />
  );
}

function ServiceCard({ service }: { service: ServiceStatus }) {
  const hasChecks = service.checks.mongodb || service.checks.memory;
  return (
    <div
      className="flex flex-col gap-4 rounded-xl border p-5"
      style={{ background: "#121820", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-slate-500">{SERVICE_ICONS[service.id]}</span>
          <span className="text-sm font-medium text-slate-100">{service.name}</span>
        </div>
        <StatusPill status={service.status} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-slate-500">
        <span>{service.latency}ms</span>
        {service.uptime != null && <span>Up {formatUptime(service.uptime)}</span>}
        {service.version && <span>v{service.version}</span>}
      </div>

      {hasChecks && (
        <div
          className="flex flex-col gap-2 border-t pt-3"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          {service.checks.mongodb && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Database className="h-3 w-3" />
                MongoDB
              </span>
              <span style={{ color: STATUS_HEX[service.checks.mongodb.status] }}>
                {service.checks.mongodb.message ?? service.checks.mongodb.status}
              </span>
            </div>
          )}
          {service.checks.memory && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Cpu className="h-3 w-3" />
                Memory
              </span>
              <span style={{ color: STATUS_HEX[service.checks.memory.status] }}>
                {service.checks.memory.message ?? service.checks.memory.status}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="h-36 animate-pulse rounded-xl border"
      style={{ background: "#121820", borderColor: "rgba(255,255,255,0.06)" }}
    />
  );
}

export default function StatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const refresh = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      setData((await res.json()) as StatusResponse);
      setLastChecked(new Date().toISOString());
      setFetchError(false);
    } catch {
      setFetchError(true);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const loading = fetching && !data;

  return (
    <main
      className="min-h-dvh px-4 py-14 sm:px-6"
      style={{ background: "#0a0e12" }}
      id="main"
      tabIndex={-1}
    >
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <Link
              href="/"
              className="font-mono text-xs text-slate-500 transition-colors hover:text-slate-300"
            >
              ← FreightMatch
            </Link>
            <h1
              className="mt-2 text-2xl font-bold tracking-tight text-slate-100"
              style={{ fontFamily: "var(--font-display)" }}
            >
              System Status
            </h1>
          </div>
          <button
            onClick={refresh}
            disabled={fetching}
            className="fm-focus-ring flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-50"
            style={{ borderColor: "rgba(255,255,255,0.08)", background: "#121820" }}
          >
            <RefreshCw className={`h-3 w-3 ${fetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Overall banner */}
        {loading ? (
          <SkeletonBanner />
        ) : fetchError && !data ? (
          <div
            className="flex items-center gap-3 rounded-xl border px-6 py-5"
            style={{ background: "#e5484d0f", borderColor: "#e5484d2e" }}
          >
            <XCircle className="h-6 w-6 shrink-0 text-[#e5484d]" />
            <span className="text-lg font-semibold text-slate-100">Unable to reach status API</span>
          </div>
        ) : data ? (
          <OverallBanner status={data.overall} />
        ) : null}

        <p className="mt-3 text-right font-mono text-xs text-slate-600">
          {lastChecked ? `Updated ${formatAgo(lastChecked)} · refreshes every 30s` : "Checking…"}
        </p>

        {/* Services grid */}
        <section className="mt-10" aria-label="Service statuses">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-slate-600">
            Services
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : data?.services.map((svc) => <ServiceCard key={svc.id} service={svc} />)}
          </div>
        </section>
      </div>
    </main>
  );
}
