"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";

export function Navbar() {
  const { user, logout } = useAuth();
  const rolePillStyle =
    user?.role === "Shipper"
      ? {
          color: "var(--color-transit)",
          borderColor: "color-mix(in srgb, var(--color-transit) 30%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--color-transit) 10%, transparent)",
        }
      : {
          color: "var(--color-go)",
          borderColor: "color-mix(in srgb, var(--color-go) 30%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--color-go) 10%, transparent)",
        };

  return (
    <header className="h-12 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center px-6 gap-4">
      <Link
        href="/"
        className="font-mono text-sm font-semibold text-slate-100 tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Freight<span className="text-amber-400">Match</span>
      </Link>

      <span className="flex-1" />

      {user && (
        <>
          <span className="rounded border px-2 py-0.5 font-mono text-xs" style={rolePillStyle}>
            {user.role}
          </span>

          <div className="h-7 w-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center">
            <span className="font-mono text-xs text-slate-300 uppercase">
              {user.email.charAt(0)}
            </span>
          </div>

          <button
            onClick={() => void logout()}
            className="font-mono text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            logout
          </button>
        </>
      )}
    </header>
  );
}
