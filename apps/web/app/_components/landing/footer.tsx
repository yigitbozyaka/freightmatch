import Link from "next/link";
import { Grain } from "./grain";

const ASCII = `┌─────────────────────────────┐
│  ▚▚  FREIGHTMATCH           │
│  ▚▚  OPS CONSOLE            │
│  ▚▚  v0.1.0 · all systems   │
└─────────────────────────────┘`;

export function LandingFooter() {
  return (
    <footer className="relative overflow-hidden bg-slate-950">
      <Grain opacity={0.07} />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-16 sm:px-10 lg:grid-cols-[minmax(0,1fr)_auto]">
        <pre
          aria-hidden="true"
          className="font-mono text-[10px] leading-tight whitespace-pre text-amber-400/80 sm:text-xs"
        >
          {ASCII}
        </pre>

        <nav className="grid grid-cols-2 gap-x-12 gap-y-3 font-mono text-[11px] tracking-[0.24em] uppercase sm:grid-cols-3">
          <FooterLink href="/login">Sign&nbsp;In</FooterLink>
          <FooterLink href="/register">Create&nbsp;Account</FooterLink>
          <FooterLink href="/dashboard">Dashboard</FooterLink>
          <FooterLink href="/chat">Chat</FooterLink>
          <FooterLink href="https://github.com/yigitbozyaka/freightmatch">GitHub</FooterLink>
          <FooterLink href="mailto:hello@freightmatch.dev">Contact</FooterLink>
        </nav>
      </div>

      <div className="relative border-t border-slate-800/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 font-mono text-[10px] tracking-[0.28em] text-slate-500 uppercase sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <span>© 2026 FreightMatch · All systems nominal</span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-go)] shadow-[0_0_8px_rgba(61,214,140,0.55)]"
            />
            uptime · 99.98%
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="text-slate-400 transition-colors hover:text-amber-300" href={href}>
      {children}
    </Link>
  );
}
