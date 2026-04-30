import type { User } from "@/lib/api/users";

const AUTH_PATHS = new Set(["/login", "/register"]);

export function dashboardForRole(role: User["role"]) {
  return role === "Shipper" ? "/shipper/dashboard" : "/carrier/dashboard";
}

export function safeNext(raw: string | null) {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;

  try {
    const parsed = new URL(raw, "http://freightmatch.local");
    if (parsed.origin !== "http://freightmatch.local") return null;
    if (AUTH_PATHS.has(parsed.pathname)) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
