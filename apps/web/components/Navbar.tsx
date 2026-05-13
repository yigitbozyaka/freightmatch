"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings as SettingsIcon, UserCircle } from "lucide-react";
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

  const dashboardHref = user?.role === "Carrier" ? "/carrier/dashboard" : "/shipper/dashboard";

  return (
    <header className="h-12 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center px-6 gap-4">
      <Link
        href={user ? dashboardHref : "/"}
        className="font-mono text-sm font-semibold text-slate-100 tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Freight<span className="text-amber-400">Match</span>
      </Link>

      {user && (
        <nav className="hidden sm:flex items-center gap-1 ml-4">
          {user.role === "Carrier" ? (
            <>
              <NavLink href="/carrier/dashboard" label="Dashboard" />
              <NavLink href="/marketplace" label="Marketplace" />
              <NavLink href="/bids" label="My Bids" />
            </>
          ) : (
            <>
              <NavLink href="/shipper/dashboard" label="Dashboard" />
              <NavLink href="/shipper/loads" label="My Loads" />
            </>
          )}
        </nav>
      )}

      <span className="flex-1" />

      {user && (
        <>
          <span className="rounded border px-2 py-0.5 font-mono text-xs" style={rolePillStyle}>
            {user.role}
          </span>

          <UserMenu
            email={user.email}
            isShipper={user.role === "Shipper"}
            onLogout={() => void logout()}
          />
        </>
      )}
    </header>
  );
}

function UserMenu({
  email,
  isShipper,
  onLogout,
}: {
  email: string;
  isShipper: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="fm-focus-ring flex h-7 w-7 items-center justify-center rounded-full border border-slate-600 bg-slate-700 transition-colors hover:border-amber-400/60 hover:bg-slate-600"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span className="font-mono text-xs uppercase text-slate-300">{email.charAt(0)}</span>
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-md border border-slate-800 bg-slate-900/95 shadow-lg backdrop-blur"
          role="menu"
        >
          <div className="border-b border-slate-800 px-3 py-2">
            <p className="truncate font-mono text-[11px] text-slate-300">{email}</p>
          </div>

          <MenuLink
            href={isShipper ? "/shipper/profile" : "/carrier/profile"}
            icon={<UserCircle aria-hidden="true" className="h-3.5 w-3.5" />}
            label="Profile"
            onSelect={() => setOpen(false)}
          />

          <MenuLink
            href="/settings"
            icon={<SettingsIcon aria-hidden="true" className="h-3.5 w-3.5" />}
            label="Settings"
            onSelect={() => setOpen(false)}
          />

          <button
            className="flex w-full items-center gap-2 border-t border-slate-800 px-3 py-2 text-left font-mono text-xs uppercase tracking-[0.2em] text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-[--color-danger]"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            role="menuitem"
            type="button"
          >
            <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  label,
  onSelect,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Link
      className="flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-[0.2em] text-slate-300 transition-colors hover:bg-slate-800/80 hover:text-amber-300"
      href={href}
      onClick={onSelect}
      role="menuitem"
    >
      {icon}
      {label}
    </Link>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
        isActive
          ? "bg-amber-400/15 text-amber-300"
          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
      }`}
    >
      {label}
    </Link>
  );
}
