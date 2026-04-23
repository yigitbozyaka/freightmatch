'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { ToastHost, useToastQueue } from '@/components/primitives/ToastHost';

type ShipperProfile = {
  companyName: string;
  bio: string;
  completedLoads: number;
  avgTimeToAcceptHours: number;
  photoUrl?: string;
};

export default function ShipperProfilePage() {
  const { toasts, pushToast, dismissToast } = useToastQueue();
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedPhotoPreview, setHasUnsavedPhotoPreview] = useState(false);
  const [profile, setProfile] = useState<ShipperProfile>({
    companyName: '',
    bio: '',
    completedLoads: 0,
    avgTimeToAcceptHours: 0,
    photoUrl: '',
  });
  const [initialProfile, setInitialProfile] = useState<ShipperProfile | null>(null);
  const hasHydratedProfile = useRef(false);

  const profileQuery = useQuery({
    queryKey: ['shipper-profile'],
    queryFn: () => apiFetch<ShipperProfile>('api/users/shipper-profile'),
  });

  useEffect(() => {
    if (!profileQuery.data || hasHydratedProfile.current) return;
    setProfile(profileQuery.data);
    setInitialProfile(profileQuery.data);
    setHasUnsavedPhotoPreview(false);
    hasHydratedProfile.current = true;
  }, [profileQuery.data]);

  const initials = useMemo(() => {
    const words = profile.companyName.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'FM';
    return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  }, [profile.companyName]);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedMimeTypes.includes(file.type)) {
      pushToast('Photo must be PNG, JPEG, or WebP.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      pushToast('Photo must be 2 MB or smaller.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfile((prev) => ({ ...prev, photoUrl: String(reader.result ?? '') })); // TODO: Replace preview-only flow with real upload endpoint.
      setHasUnsavedPhotoPreview(true);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!initialProfile) return;

    const dirtyFields: Partial<Pick<ShipperProfile, 'companyName' | 'bio'>> = {};
    if (profile.companyName !== initialProfile.companyName) {
      dirtyFields.companyName = profile.companyName;
    }
    if (profile.bio !== initialProfile.bio) {
      dirtyFields.bio = profile.bio;
    }
    if (Object.keys(dirtyFields).length === 0) {
      pushToast('Nothing changed yet.', 'info');
      return;
    }

    setIsSaving(true);
    try {
      await apiFetch('api/users/shipper-profile', {
        method: 'PATCH',
        body: JSON.stringify(dirtyFields),
      });
      pushToast('Profile saved successfully.', 'info');
      setInitialProfile((prev) => (prev ? { ...prev, ...dirtyFields } : prev));
    } catch {
      pushToast('Profile could not be saved.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="space-y-6 px-8 py-10">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Shipper / Profile</p>
        <h1 className="text-2xl font-bold text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>
          Company Profile
        </h1>
      </header>

      {profileQuery.isLoading ? (
        <p className="font-mono text-xs uppercase tracking-wider text-slate-400">Loading profile…</p>
      ) : null}
      {profileQuery.isError ? (
        <p className="font-mono text-xs uppercase tracking-wider text-[--color-danger]">
          Could not load your profile. Please refresh and try again.
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-slate-400">Photo</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-700 bg-slate-800 font-mono text-sm text-slate-200">
              {profile.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photoUrl} alt="Company avatar" className="h-full w-full rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <label className="cursor-pointer rounded border border-slate-700 px-3 py-2 font-mono text-xs text-slate-200 hover:border-slate-500">
              Upload photo
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFileChange} />
            </label>
          </div>
          {hasUnsavedPhotoPreview ? (
            <p className="mt-2 font-mono text-[11px] text-amber-300">
              Photo preview only for now; upload persistence is coming soon.
            </p>
          ) : null}
        </article>

        <article className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-slate-400">Completed Loads</p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-100 tabular-nums">{profile.completedLoads}</p>
        </article>

        <article className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-slate-400">Avg Time To Accept</p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-100 tabular-nums">
            {profile.avgTimeToAcceptHours}h
          </p>
        </article>
      </section>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
        <div className="space-y-1.5">
          <label htmlFor="companyName" className="font-mono text-xs uppercase tracking-widest text-slate-300">
            Company Name
          </label>
          <input
            id="companyName"
            value={profile.companyName}
            onChange={(e) => setProfile((p) => ({ ...p, companyName: e.target.value }))}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none focus:border-amber-400"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="bio" className="font-mono text-xs uppercase tracking-widest text-slate-300">
            Bio
          </label>
          <textarea
            id="bio"
            rows={4}
            value={profile.bio}
            onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none focus:border-amber-400"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving || profileQuery.isLoading || profileQuery.isError || !initialProfile}
          className="rounded border border-amber-400 bg-amber-400/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] text-amber-300 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
