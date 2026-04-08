import { API_BASE_URL } from "./axios-config";

export interface ServiceCheck {
  status: string;
  message: string;
}

export interface ServiceHealth {
  key: string;
  label: string;
  status: "healthy" | "degraded" | "unhealthy" | "offline";
  version: string;
  uptime: number;
  checks: {
    mongodb: ServiceCheck;
    memory: ServiceCheck;
  };
}

const SERVICES = [
  { key: "users", label: "User Service" },
  { key: "loads", label: "Load Service" },
  { key: "bids", label: "Bidding Service" },
  { key: "match", label: "Matching Service" },
] as const;

export { SERVICES };

export async function checkServiceHealth(
  serviceKey: string,
  serviceLabel: string
): Promise<ServiceHealth> {
  try {
    // Use fetch instead of axios — axios throws on non-2xx (503 for unhealthy)
    // but the response body still contains valid health data
    const response = await fetch(`${API_BASE_URL || ""}/health/${serviceKey}`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    return {
      key: serviceKey,
      label: serviceLabel,
      status: data.status ?? "offline",
      version: data.version ?? "",
      uptime: data.uptime ?? 0,
      checks: {
        mongodb: data.checks?.mongodb ?? { status: "unknown", message: "N/A" },
        memory: data.checks?.memory ?? { status: "unknown", message: "N/A" },
      },
    };
  } catch {
    return {
      key: serviceKey,
      label: serviceLabel,
      status: "offline",
      version: "",
      uptime: 0,
      checks: {
        mongodb: { status: "unknown", message: "Unreachable" },
        memory: { status: "unknown", message: "Unreachable" },
      },
    };
  }
}

export async function checkAllServices(): Promise<ServiceHealth[]> {
  const results = await Promise.all(
    SERVICES.map((s) => checkServiceHealth(s.key, s.label))
  );
  return results;
}
