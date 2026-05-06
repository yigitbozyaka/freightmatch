"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Save } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { KpiTile } from "@/components/primitives/KpiTile";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { ToastHost, useToastQueue } from "@/components/primitives/ToastHost";
import { useAuth } from "@/lib/hooks/useAuth";
import { ApiResponseError } from "@/lib/api/client";
import {
  getProfile,
  updateShipperProfile,
  type ProfileResponse,
  type ShipperProfile,
} from "@/lib/api/users";

const BIO_MAX = 500;
const COMPANY_MAX = 200;

export default function ShipperProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toasts, pushToast, dismissToast } = useToastQueue();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["users", "profile"],
    queryFn: getProfile,
    enabled: Boolean(user),
  });

  if (authLoading || (profileQuery.isLoading && !profileQuery.data)) {
    return <PageSkeleton />;
  }

  if (user && user.role !== "Shipper") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">
          Shipper account required
        </p>
      </div>
    );
  }

  if (!profileQuery.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[--color-danger]">
          Failed to load profile
        </p>
      </div>
    );
  }

  return (
    <ProfileForm
      onError={(msg) => pushToast(msg, "error")}
      onSuccess={(msg) => pushToast(msg, "info")}
      profile={profileQuery.data}
      queryClient={queryClient}
      toastHost={<ToastHost toasts={toasts} onDismiss={dismissToast} />}
    />
  );
}

function ProfileForm({
  profile,
  queryClient,
  onSuccess,
  onError,
  toastHost,
}: {
  profile: ProfileResponse;
  queryClient: ReturnType<typeof useQueryClient>;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  toastHost: React.ReactNode;
}) {
  const shipper: ShipperProfile = profile.shipperProfile ?? {};
  const [companyName, setCompanyName] = React.useState(shipper.companyName ?? "");
  const [bio, setBio] = React.useState(shipper.bio ?? "");
  const [photoUrl, setPhotoUrl] = React.useState(shipper.profilePhotoUrl ?? "");

  const initial = React.useMemo(
    () => ({
      companyName: shipper.companyName ?? "",
      bio: shipper.bio ?? "",
      photoUrl: shipper.profilePhotoUrl ?? "",
    }),
    [shipper.companyName, shipper.bio, shipper.profilePhotoUrl],
  );

  const isDirty =
    companyName !== initial.companyName || bio !== initial.bio || photoUrl !== initial.photoUrl;

  const companyError =
    companyName.length > COMPANY_MAX ? `Max ${COMPANY_MAX} characters` : undefined;
  const bioError = bio.length > BIO_MAX ? `Max ${BIO_MAX} characters` : undefined;
  const hasError = Boolean(companyError || bioError);

  const mutation = useMutation({
    mutationFn: () =>
      updateShipperProfile({
        companyName: companyName.trim() ? companyName.trim() : null,
        bio: bio.trim() ? bio.trim() : null,
        profilePhotoUrl: photoUrl.trim() ? photoUrl.trim() : null,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData<ProfileResponse>(["users", "profile"], (prev) =>
        prev ? { ...prev, shipperProfile: data.shipperProfile } : prev,
      );
      onSuccess("Profile saved");
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiResponseError ? err.message : "Failed to save profile";
      onError(message);
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (hasError) return;
    mutation.mutate();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Shipper</p>
        <h1
          className="mt-1 text-2xl font-bold text-slate-100 sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Profile
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Public information shippers see when you bid on their loads.
        </p>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <KpiTile label="Completed loads" value={profile.shipperProfile?.completedLoads ?? 0} />
        <KpiTile
          label="Avg time to accept"
          value={profile.shipperProfile?.avgTimeToAcceptHours ?? 0}
          maximumFractionDigits={1}
          unit="h"
        />
      </section>

      <form className="mt-8 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]" onSubmit={handleSubmit}>
        <div className="fm-panel-muted rounded-lg p-4">
          <SectionHeader label="Photo" />
          <div className="mt-4 flex flex-col items-center gap-3">
            <PhotoPreview url={photoUrl} />
            <div className="w-full">
              <label
                className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"
                htmlFor="photo-url"
              >
                Photo URL
              </label>
              <Input
                id="photo-url"
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://…"
                type="url"
                value={photoUrl}
              />
            </div>
            <p className="font-mono text-[10px] leading-relaxed tracking-[0.12em] text-slate-500">
              File upload lands in P1. URL works today.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="fm-panel-muted rounded-lg p-4">
            <SectionHeader label="Company" />
            <div className="mt-4 space-y-4">
              <div>
                <label
                  className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"
                  htmlFor="company-name"
                >
                  Company name
                </label>
                <Input
                  error={companyError}
                  id="company-name"
                  maxLength={COMPANY_MAX + 50}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Logistics"
                  value={companyName}
                />
              </div>

              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <label
                    className="block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"
                    htmlFor="bio"
                  >
                    Bio
                  </label>
                  <span className="font-mono text-[10px] tabular-nums text-slate-600">
                    {bio.length} / {BIO_MAX}
                  </span>
                </div>
                <textarea
                  className="fm-focus-ring w-full rounded-md border border-slate-700 bg-slate-800/95 px-3.5 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                  id="bio"
                  maxLength={BIO_MAX + 50}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short description of your operation."
                  rows={5}
                  value={bio}
                />
                {bioError ? (
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-danger)]">
                    {bioError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {isDirty ? "Unsaved changes" : "Up to date"}
            </p>
            <Button
              disabled={!isDirty || hasError || mutation.isPending}
              loading={mutation.isPending}
              type="submit"
              variant="primary"
            >
              <Save aria-hidden="true" className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </div>
      </form>

      {toastHost}
    </div>
  );
}

function PhotoPreview({ url }: { url: string }) {
  const trimmed = url.trim();
  if (!trimmed) {
    return (
      <div className="flex h-32 w-32 items-center justify-center rounded-full border border-dashed border-slate-700 bg-slate-900/60 text-slate-600">
        <ImagePlus className="h-6 w-6" aria-hidden="true" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt=""
      className="h-32 w-32 rounded-full border border-slate-700 object-cover"
      src={trimmed}
    />
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-8 w-40 animate-pulse rounded bg-slate-800" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="h-20 animate-pulse rounded bg-slate-800/60" />
        <div className="h-20 animate-pulse rounded bg-slate-800/60" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="h-64 animate-pulse rounded bg-slate-800/60" />
        <div className="h-64 animate-pulse rounded bg-slate-800/60" />
      </div>
    </div>
  );
}
