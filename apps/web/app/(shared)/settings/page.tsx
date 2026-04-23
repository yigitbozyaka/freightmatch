'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ToastHost, useToastQueue } from '@/components/primitives/ToastHost';

const STORAGE_KEY = 'fm.settings.notifications';

type NotificationPrefs = {
  newBids: boolean;
  loadStatusChanges: boolean;
};

export default function SettingsPage() {
  const { toasts, pushToast, dismissToast } = useToastQueue();
  const [email] = useState('current-user@freightmatch.com');
  const [newPassword, setNewPassword] = useState('');
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    newBids: true,
    loadStatusChanges: true,
  });

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as NotificationPrefs;
      setPrefs(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const onPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.trim().length < 8) {
      pushToast('Password must be at least 8 characters.', 'error');
      return;
    }

    // Stub: endpoint not wired yet in v1
    pushToast('Password change is coming soon.', 'info');
    setNewPassword('');
  };

  return (
    <main className="space-y-6 px-8 py-10">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Shared / Settings</p>
        <h1 className="text-2xl font-bold text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>
          Account Settings
        </h1>
      </header>

      <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="font-mono text-sm uppercase tracking-widest text-slate-300">Security</h2>

        <div className="space-y-1.5">
          <label className="font-mono text-xs uppercase tracking-widest text-slate-400">Email (read-only)</label>
          <input
            value={email}
            disabled
            aria-readonly="true"
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2.5 font-mono text-sm text-slate-400"
          />
        </div>

        <form onSubmit={onPasswordSubmit} className="space-y-1.5">
          <label htmlFor="newPassword" className="font-mono text-xs uppercase tracking-widest text-slate-400">
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none focus:border-amber-400"
          />
          <p className="font-mono text-[11px] text-slate-500">Coming soon</p>
          <button
            type="submit"
            className="rounded border border-amber-400 bg-amber-400/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] text-amber-300"
          >
            Update Password
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="font-mono text-sm uppercase tracking-widest text-slate-300">Notifications</h2>

        <label className="flex items-center gap-2 font-mono text-sm text-slate-200">
          <input
            type="checkbox"
            checked={prefs.newBids}
            onChange={(e) => setPrefs((p) => ({ ...p, newBids: e.target.checked }))}
          />
          Email me on new bids
          <span className="rounded border border-amber-500/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">
            Coming soon
          </span>
        </label>

        <label className="flex items-center gap-2 font-mono text-sm text-slate-200">
          <input
            type="checkbox"
            checked={prefs.loadStatusChanges}
            onChange={(e) => setPrefs((p) => ({ ...p, loadStatusChanges: e.target.checked }))}
          />
          Email me on load status changes
          <span className="rounded border border-amber-500/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">
            Coming soon
          </span>
        </label>
      </section>

      <section className="space-y-3 rounded-lg border border-[--color-danger]/40 bg-[--color-danger]/10 p-5">
        <h2 className="font-mono text-sm uppercase tracking-widest text-[--color-danger]">Danger Zone</h2>
        <button
          type="button"
          disabled
          title="Please contact support to delete your account."
          className="cursor-not-allowed rounded border border-[--color-danger]/50 px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] text-[--color-danger] opacity-60"
        >
          Delete Account
        </button>
      </section>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
