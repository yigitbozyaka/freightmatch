import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost";
const ACCESS_COOKIE = "fm_access";
const REFRESH_COOKIE = "fm_refresh";
const CSRF_COOKIE = "fm_csrf";
const CSRF_HEADER = "x-fm-csrf";
const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;
const CSRF_MAX_AGE = 24 * 60 * 60;

type RouteContext = { params: Promise<{ path: string[] }> };

function accessOpts(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    maxAge: ACCESS_MAX_AGE,
    path: "/",
  };
}

function refreshOpts() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "strict" as const,
    maxAge: REFRESH_MAX_AGE,
    path: "/",
  };
}

function csrfOpts(secure: boolean) {
  return {
    httpOnly: false,
    secure,
    sameSite: "strict" as const,
    maxAge: CSRF_MAX_AGE,
    path: "/",
  };
}

const isProd = () => process.env.NODE_ENV === "production";

const CSRF_EXEMPT_PATHS = new Set([
  "api/users/login",
  "api/users/register",
  "api/users/refresh",
]);

async function attemptRefresh(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): Promise<string | null> {
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  const res = await fetch(`${GATEWAY_URL}/api/users/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { accessToken: string; refreshToken?: string };
  cookieStore.set(ACCESS_COOKIE, data.accessToken, accessOpts(isProd()));
  if (data.refreshToken) {
    cookieStore.set(REFRESH_COOKIE, data.refreshToken, refreshOpts());
  }

  return data.accessToken;
}

async function proxyRequest(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { path } = await ctx.params;
  const cookieStore = await cookies();
  const pathStr = path.join("/");
  const search = req.nextUrl.search;
  const upstreamUrl = `${GATEWAY_URL}/${pathStr}${search}`;

  const isLogin = pathStr === "api/users/login";
  const isLogout = pathStr === "api/users/logout";
  const isMutatingMethod = ["POST", "PATCH", "PUT", "DELETE"].includes(req.method);
  const csrfCookie = cookieStore.get(CSRF_COOKIE)?.value;
  const csrfToken = csrfCookie ?? crypto.randomUUID();
  if (!csrfCookie) {
    cookieStore.set(CSRF_COOKIE, csrfToken, csrfOpts(isProd()));
  }

  if (isMutatingMethod && !CSRF_EXEMPT_PATHS.has(pathStr)) {
    const csrfHeader = req.headers.get(CSRF_HEADER);
    if (!csrfHeader || csrfHeader !== csrfToken) {
      return NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 });
    }
  }

  const headers = new Headers({ "Content-Type": "application/json", Accept: "application/json" });
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const body = req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined;

  const callUpstream = () => fetch(upstreamUrl, { method: req.method, headers, body });

  let upstream = await callUpstream();

  if (upstream.status === 401 && !isLogin) {
    const newToken = await attemptRefresh(cookieStore);
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      upstream = await callUpstream();
    }
    if (upstream.status === 401) {
      cookieStore.delete(ACCESS_COOKIE);
      cookieStore.delete(REFRESH_COOKIE);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (isLogin && upstream.ok) {
    const data = (await upstream.json()) as {
      accessToken: string;
      refreshToken: string;
      user: unknown;
    };
    const response = NextResponse.json({ user: data.user }, { status: upstream.status });
    response.cookies.set(ACCESS_COOKIE, data.accessToken, accessOpts(isProd()));
    response.cookies.set(REFRESH_COOKIE, data.refreshToken, refreshOpts());
    response.cookies.set(CSRF_COOKIE, csrfToken, csrfOpts(isProd()));
    return response;
  }

  if (isLogout && upstream.ok) {
    const response = NextResponse.json({}, { status: 200 });
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  const responseBody = await upstream.text();
  const contentType = upstream.headers.get("Content-Type") ?? "application/json";
  const response = new NextResponse(responseBody || null, {
    status: upstream.status,
    headers: { "Content-Type": contentType },
  });
  response.cookies.set(CSRF_COOKIE, csrfToken, csrfOpts(isProd()));
  return response;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, ctx);
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, ctx);
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, ctx);
}
