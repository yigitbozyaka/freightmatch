"use client";

import * as React from "react";
import { AlertTriangle, KeyRound, Mail, ShieldAlert } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { ToastHost, useToastQueue } from "@/components/primitives/ToastHost";
import { useAuth } from "@/lib/hooks/useAuth";

const NOTIFICATIONS_STORAGE_KEY = "fm:settings:notifications:v1";

type NotificationPrefs = {
  newBids: boolean;
  loadStatusChanges: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  newBids: true,
  loadStatusChanges: true,
};

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const { toasts, pushToast, dismissToast } = useToastQueue();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-800" />
        <div className="mt-6 space-y-3">
          <div className="h-32 animate-pulse rounded bg-slate-800/60" />
          <div className="h-32 animate-pulse rounded bg-slate-800/60" />
          <div className="h-32 animate-pulse rounded bg-slate-800/60" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">
          Sign in required
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Account</p>
        <h1
          className="mt-1 text-2xl font-bold text-slate-100 sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Settings
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage credentials, alerts, and account state.
        </p>
      </header>

      <div className="mt-8 space-y-6">
        <EmailSection email={user.email} />
        <PasswordSection onToast={pushToast} />
        <NotificationsSection onToast={pushToast} />
        <DangerZone />
      </div>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function EmailSection({ email }: { email: string }) {
  return (
    <section className="fm-panel-muted rounded-lg p-4">
      <SectionHeader label="Email" />
      <div className="mt-4 flex items-center gap-3">
        <Mail aria-hidden="true" className="h-4 w-4 text-amber-400" />
        <span className="font-mono text-sm text-slate-200">{email}</span>
        <span className="ml-auto rounded border border-slate-700 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Read only
        </span>
      </div>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
        Contact support to change your email.
      </p>
    </section>
  );
}

function PasswordSection({
  onToast,
}: {
  onToast: (msg: string, variant?: "info" | "error") => void;
}) {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  const mismatch = next.length > 0 && confirm.length > 0 && next !== confirm;
  const tooShort = next.length > 0 && next.length < 8;

  const disabled = !current || !next || !confirm || mismatch || tooShort || next === current;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onToast("Password change endpoint pending — coming soon", "error");
  };

  return (
    <section className="fm-panel-muted rounded-lg p-4">
      <div className="flex items-center gap-2">
        <SectionHeader label="Password" />
        <span className="ml-auto rounded border border-slate-700 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Coming soon
        </span>
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"
            htmlFor="current-password"
          >
            Current password
          </label>
          <Input
            autoComplete="current-password"
            id="current-password"
            onChange={(e) => setCurrent(e.target.value)}
            type="password"
            value={current}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"
              htmlFor="new-password"
            >
              New password
            </label>
            <Input
              autoComplete="new-password"
              error={tooShort ? "Min 8 characters" : undefined}
              id="new-password"
              onChange={(e) => setNext(e.target.value)}
              type="password"
              value={next}
            />
          </div>
          <div>
            <label
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"
              htmlFor="confirm-password"
            >
              Confirm new
            </label>
            <Input
              autoComplete="new-password"
              error={mismatch ? "Passwords do not match" : undefined}
              id="confirm-password"
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              value={confirm}
            />
          </div>
        </div>
        <div className="flex items-center justify-end">
          <Button disabled={disabled} type="submit" variant="secondary">
            <KeyRound aria-hidden="true" className="h-3.5 w-3.5" />
            Change password
          </Button>
        </div>
      </form>
    </section>
  );
}

function NotificationsSection({
  onToast,
}: {
  onToast: (msg: string, variant?: "info" | "error") => void;
}) {
  const [prefs, setPrefs] = React.useState<NotificationPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
        setPrefs({
          newBids: parsed.newBids ?? DEFAULT_PREFS.newBids,
          loadStatusChanges: parsed.loadStatusChanges ?? DEFAULT_PREFS.loadStatusChanges,
        });
      }
    } catch {
      // ignore corrupt local state
    }
    setHydrated(true);
  }, []);

  const toggle = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => {
      const nextPrefs = { ...prev, [key]: !prev[key] };
      try {
        window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(nextPrefs));
      } catch {
        // localStorage may be disabled
      }
      onToast("Preference saved");
      return nextPrefs;
    });
  };

  return (
    <section className="fm-panel-muted rounded-lg p-4">
      <div className="flex items-center gap-2">
        <SectionHeader label="Notifications" />
        <span className="ml-auto rounded border border-slate-700 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Coming soon
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <ToggleRow
          checked={prefs.newBids}
          disabled={!hydrated}
          label="Email me on new bids"
          onChange={() => toggle("newBids")}
        />
        <ToggleRow
          checked={prefs.loadStatusChanges}
          disabled={!hydrated}
          label="Email me on load status changes"
          onChange={() => toggle("loadStatusChanges")}
        />
      </div>

      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
        Saved locally until the notifications service ships.
      </p>
    </section>
  );
}

function ToggleRow({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded border border-slate-800 bg-slate-950/40 px-3 py-2.5 hover:border-slate-700">
      <span className="text-sm text-slate-200">{label}</span>
      <input
        checked={checked}
        className="h-4 w-4 cursor-pointer accent-amber-400"
        disabled={disabled}
        onChange={onChange}
        type="checkbox"
      />
    </label>
  );
}

function DangerZone() {
  return (
    <section className="rounded-lg border border-[--color-danger]/40 bg-[--color-danger]/5 p-4">
      <div className="flex items-center gap-2">
        <ShieldAlert aria-hidden="true" className="h-4 w-4 text-[--color-danger]" />
        <h2 className="font-mono text-xs uppercase tracking-widest text-[--color-danger]">
          Danger zone
        </h2>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-200">Delete account</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Permanently removes your data. Contact support to proceed.
          </p>
        </div>
        <span title="Contact support to proceed">
          <Button disabled type="button" variant="danger">
            <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
            Delete account
          </Button>
        </span>
      </div>
    </section>
  );
}
