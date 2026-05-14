"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImageUp, Save, X } from "lucide-react";
import ReactCrop, {
  centerCrop,
  convertToPixelCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { KpiTile } from "@/components/primitives/KpiTile";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { ToastHost, useToastQueue } from "@/components/primitives/ToastHost";
import { ApiResponseError } from "@/lib/api/client";
import { resolveUploadedPhotoUrl } from "@/lib/api/uploads";
import {
  getProfile,
  updateShipperProfile,
  uploadProfilePhoto,
  type ProfileResponse,
  type ShipperProfile,
} from "@/lib/api/users";
import { useAuth } from "@/lib/hooks/useAuth";
import { cn } from "@/lib/ui/cn";

const BIO_MAX = 500;
const COMPANY_MAX = 200;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PHOTO_OUTPUT_SIZE = 512;

type SaveProfileResult = {
  profile: ProfileResponse;
  photoUploaded: boolean;
  photoUploadError: string | null;
};

export default function ShipperProfilePage() {
  const { user, isLoading: authLoading, setUser } = useAuth();
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
      setUser={setUser}
      toastHost={<ToastHost toasts={toasts} onDismiss={dismissToast} />}
    />
  );
}

function ProfileForm({
  profile,
  queryClient,
  setUser,
  onSuccess,
  onError,
  toastHost,
}: {
  profile: ProfileResponse;
  queryClient: ReturnType<typeof useQueryClient>;
  setUser: (user: ProfileResponse | null) => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  toastHost: React.ReactNode;
}) {
  const shipper: ShipperProfile = profile.shipperProfile ?? {};
  const [companyName, setCompanyName] = React.useState(shipper.companyName ?? "");
  const [bio, setBio] = React.useState(shipper.bio ?? "");
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState<Crop>();
  const [completedCrop, setCompletedCrop] = React.useState<PixelCrop>();
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const initial = React.useMemo(
    () => ({
      companyName: shipper.companyName ?? "",
      bio: shipper.bio ?? "",
    }),
    [shipper.companyName, shipper.bio],
  );

  React.useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  const isDirty = companyName !== initial.companyName || bio !== initial.bio;
  const hasPendingPhoto = Boolean(cropSrc && completedCrop?.width && completedCrop?.height);

  const companyError =
    companyName.length > COMPANY_MAX ? `Max ${COMPANY_MAX} characters` : undefined;
  const bioError = bio.length > BIO_MAX ? `Max ${BIO_MAX} characters` : undefined;
  const hasError = Boolean(companyError || bioError);

  const mutation = useMutation({
    mutationFn: async (): Promise<SaveProfileResult> => {
      const shouldUploadPhoto = Boolean(cropSrc && completedCrop?.width && completedCrop?.height);
      setUploadError(null);
      setUploadProgress(shouldUploadPhoto ? 0 : null);

      const savedProfile = await updateShipperProfile({
        companyName: companyName.trim() ? companyName.trim() : null,
        bio: bio.trim() ? bio.trim() : null,
      });
      let nextProfile: ProfileResponse = savedProfile;
      let photoUploaded = false;
      let photoUploadError: string | null = null;

      if (shouldUploadPhoto) {
        try {
          if (!imageRef.current || !completedCrop?.width || !completedCrop?.height) {
            throw new Error("Choose a square crop before saving.");
          }

          const blob = await cropImageToBlob(imageRef.current, completedCrop);
          const uploadedPhoto = await uploadProfilePhoto(blob, setUploadProgress);
          nextProfile =
            mergePhotoIntoProfile(
              savedProfile,
              savedProfile.shipperProfile ?? null,
              uploadedPhoto.profilePhotoUrl,
            ) ?? savedProfile;
          photoUploaded = true;
        } catch (error) {
          photoUploadError = messageFromUploadError(error);
        }
      }

      return { profile: nextProfile, photoUploaded, photoUploadError };
    },
    onSuccess: ({ profile: data, photoUploaded, photoUploadError }) => {
      queryClient.setQueryData(["users", "profile"], data);
      setUser(data);
      void queryClient.invalidateQueries({ queryKey: ["users"] });

      if (photoUploaded) {
        setCropSrc(null);
        setCrop(undefined);
        setCompletedCrop(undefined);
        setUploadProgress(100);
        setUploadError(null);
        onSuccess("Shipper profile and photo saved");
        return;
      }

      if (photoUploadError) {
        setUploadProgress(null);
        setUploadError(photoUploadError);
        onError("Profile saved, but photo upload failed");
        return;
      }

      setUploadProgress(null);
      onSuccess("Profile saved");
    },
    onError: (err: unknown) => {
      setUploadProgress(null);
      const message = err instanceof ApiResponseError ? err.message : "Failed to save profile";
      onError(message);
    },
  });

  const canSave = (isDirty || hasPendingPhoto) && !hasError && !mutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (hasError) return;
    mutation.mutate();
  };

  function handlePhotoFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
      setUploadError("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }

    setUploadProgress(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    imageRef.current = null;
    setCropSrc(URL.createObjectURL(file));
  }

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
        <PhotoPanel
          crop={crop}
          cropSrc={cropSrc}
          displayName={companyName || profile.email.split("@")[0] || "Shipper"}
          fileInputRef={fileInputRef}
          isDragActive={isDragActive}
          isSaving={mutation.isPending}
          photoUrl={resolveUploadedPhotoUrl(shipper.profilePhotoUrl)}
          progress={uploadProgress}
          uploadError={uploadError}
          onCancelCrop={() => {
            setCropSrc(null);
            setCrop(undefined);
            setCompletedCrop(undefined);
            setUploadError(null);
            setUploadProgress(null);
          }}
          onDropFile={handlePhotoFile}
          onImageLoad={(event) => {
            const image = event.currentTarget;
            imageRef.current = image;
            const nextCrop = centerCrop(
              makeAspectCrop({ unit: "%", width: 86 }, 1, image.width, image.height),
              image.width,
              image.height,
            );
            setCrop(nextCrop);
            setCompletedCrop(convertToPixelCrop(nextCrop, image.width, image.height));
          }}
          onPickFile={() => fileInputRef.current?.click()}
          onSetCompletedCrop={setCompletedCrop}
          onSetCrop={setCrop}
          onSetDragActive={setIsDragActive}
        />

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
              {isDirty || hasPendingPhoto ? "Unsaved changes" : "Up to date"}
            </p>
            <Button
              disabled={!canSave}
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

function PhotoPanel({
  crop,
  cropSrc,
  displayName,
  fileInputRef,
  isDragActive,
  isSaving,
  photoUrl,
  progress,
  uploadError,
  onCancelCrop,
  onDropFile,
  onImageLoad,
  onPickFile,
  onSetCompletedCrop,
  onSetCrop,
  onSetDragActive,
}: {
  crop: Crop | undefined;
  cropSrc: string | null;
  displayName: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isDragActive: boolean;
  isSaving: boolean;
  photoUrl: string | null;
  progress: number | null;
  uploadError: string | null;
  onCancelCrop: () => void;
  onDropFile: (file: File | undefined) => void;
  onImageLoad: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onPickFile: () => void;
  onSetCompletedCrop: (crop: PixelCrop) => void;
  onSetCrop: (crop: Crop) => void;
  onSetDragActive: (active: boolean) => void;
}) {
  const initials = initialsFor(displayName);
  const uploadProgress = progress ?? 0;
  return (
    <section className="fm-panel-muted rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <SectionHeader label="Photo" />
        <Camera className="h-4 w-4 text-amber-400" aria-hidden="true" />
      </div>

      <div className="mt-4 flex flex-col items-center gap-4">
        <div className="relative h-36 w-36 overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-800 font-mono text-3xl font-black text-slate-300">
              {initials}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            onDropFile(event.currentTarget.files?.[0]);
            event.currentTarget.value = "";
          }}
        />

        <button
          type="button"
          disabled={isSaving}
          onClick={onPickFile}
          onDragEnter={(event) => {
            event.preventDefault();
            onSetDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            onSetDragActive(true);
          }}
          onDragLeave={() => onSetDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            onSetDragActive(false);
            onDropFile(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            "fm-focus-ring flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 px-4 py-5 text-center transition-colors",
            "hover:border-amber-400/70 hover:bg-amber-400/5",
            isDragActive && "border-amber-400 bg-amber-400/10",
            isSaving && "cursor-not-allowed opacity-55",
          )}
        >
          <ImageUp className="h-5 w-5 text-amber-400" aria-hidden="true" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
            Drop photo or browse
          </span>
          <span className="text-xs text-slate-500">JPEG, PNG, or WebP</span>
        </button>
      </div>

      {cropSrc ? (
        <div className="mt-4 space-y-3 rounded-lg border border-slate-800 bg-slate-950/35 p-3">
          <ReactCrop
            aspect={1}
            crop={crop}
            minWidth={80}
            onChange={(_, percentCrop) => onSetCrop(percentCrop)}
            onComplete={(nextCrop) => onSetCompletedCrop(nextCrop)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cropSrc}
              alt="Crop selected profile photo"
              onLoad={onImageLoad}
              className="max-h-72 w-full object-contain"
            />
          </ReactCrop>
          <div className="flex justify-center">
            <Button size="sm" variant="ghost" onClick={onCancelCrop} disabled={isSaving}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {isSaving && progress !== null ? (
        <div className="mt-4">
          <div
            role="progressbar"
            aria-label="Photo upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={uploadProgress}
            className="h-2 overflow-hidden rounded-full bg-slate-800"
          >
            <div
              className="h-full rounded-full bg-amber-400 transition-[width]"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="mt-2 text-right font-mono text-[10px] tabular-nums text-slate-400">
            {uploadProgress}%
          </p>
        </div>
      ) : null}

      {uploadError ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-[--color-danger]/45 bg-[--color-danger]/10 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-red-200"
        >
          {uploadError}
        </p>
      ) : null}
    </section>
  );
}

function mergePhotoIntoProfile(
  profile: ProfileResponse | null,
  shipperProfile: ShipperProfile | null,
  profilePhotoUrl: string,
): ProfileResponse | null {
  if (!profile) return null;
  return {
    ...profile,
    shipperProfile: {
      ...(shipperProfile ?? {}),
      profilePhotoUrl,
    },
  };
}

async function cropImageToBlob(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_OUTPUT_SIZE;
  canvas.height = PHOTO_OUTPUT_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image crop.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    PHOTO_OUTPUT_SIZE,
    PHOTO_OUTPUT_SIZE,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not prepare image crop."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      0.92,
    );
  });
}

function messageFromUploadError(error: unknown): string {
  if (error instanceof ApiResponseError) {
    if (error.status === 413) return "Photo must be 5 MB or smaller.";
    if (error.status === 415) return "Only JPEG, PNG, and WebP images are allowed.";
    return error.message;
  }
  return error instanceof Error && error.message ? error.message : "Photo upload failed.";
}

function initialsFor(value: string): string {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .padEnd(2, value.charAt(0).toUpperCase())
    .slice(0, 2);
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
