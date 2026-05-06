import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/403", "/"];
const SHIPPER_PATHS = ["/shipper"];
const CARRIER_PATHS = ["/marketplace", "/carrier"];

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(payload, "base64").toString("utf-8");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_kitchen") ||
    PUBLIC_PATHS.some((p) => pathname === p)
  ) {
    return NextResponse.next();
  }

  const accessToken = req.cookies.get("fm_access")?.value;

  if (!accessToken) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeJwtPayload(accessToken);
  const role = payload?.role as string | undefined;

  const isShipperPath = SHIPPER_PATHS.some((p) => pathname.startsWith(p));
  const isCarrierPath = CARRIER_PATHS.some((p) => pathname.startsWith(p));

  if (isShipperPath && role !== "Shipper") {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  if (isCarrierPath && role !== "Carrier") {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
