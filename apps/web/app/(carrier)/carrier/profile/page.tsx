"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImageUp, Save, ShieldCheck, Star, X } from "lucide-react";
import ReactCrop, {
  centerCrop,
  convertToPixelCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import {
  Controller,
  useForm,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { MonoNum } from "@/components/primitives/MonoNum";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { ToastHost, useToastQueue } from "@/components/primitives/ToastHost";
import { ApiResponseError } from "@/lib/api/client";
import { resolveUploadedPhotoUrl } from "@/lib/api/uploads";
import {
  getProfile,
  updateCarrierProfile,
  uploadProfilePhoto,
  type CarrierProfile,
  type ProfileResponse,
  type UpdateCarrierProfileInput,
} from "@/lib/api/users";
import { useAuth } from "@/lib/hooks/useAuth";
import { cn } from "@/lib/ui/cn";

const TRUCK_TYPES = ["flatbed", "refrigerated", "dry-van", "tanker"] as const;
const UNSET_TRUCK_TYPE = "__select_truck_type__";
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BIO_LENGTH = 500;
const PHOTO_OUTPUT_SIZE = 512;

const profileFormSchema = z.object({
  truckType: z
    .enum([UNSET_TRUCK_TYPE, ...TRUCK_TYPES], {
      message: "Select your truck type.",
    })
    .refine((value) => isTruckType(value), {
      message: "Select your truck type.",
    }),
  capacityKg: z
    .number({ message: "Capacity must be a number." })
    .positive("Capacity must be greater than 0."),
  homeCity: z.string().trim().min(1, "Home city is required."),
  bio: z.string().max(MAX_BIO_LENGTH, "Bio must be 500 characters or less."),
});

type ProfileFormInput = z.input<typeof profileFormSchema>;
type ProfileFormValues = z.output<typeof profileFormSchema>;
type TruckType = (typeof TRUCK_TYPES)[number];
type PreviewMode = "mine" | "shipper";
type SaveProfileResult = {
  profile: ProfileResponse;
  photoUploaded: boolean;
  photoUploadError: string | null;
};

const truckTypeLabels: Record<(typeof TRUCK_TYPES)[number], string> = {
  flatbed: "Flatbed",
  refrigerated: "Refrigerated",
  "dry-van": "Dry van",
  tanker: "Tanker",
};

export default function CarrierProfilePage() {
  const queryClient = useQueryClient();
  const { setUser } = useAuth();
  const { toasts, pushToast, dismissToast } = useToastQueue();
  const [previewMode, setPreviewMode] = React.useState<PreviewMode>("mine");
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState<Crop>();
  const [completedCrop, setCompletedCrop] = React.useState<PixelCrop>();
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const profileQuery = useQuery({
    queryKey: ["users", "profile"],
    queryFn: getProfile,
  });

  const profile = profileQuery.data ?? null;
  const carrierProfile = profile?.carrierProfile ?? null;
  const displayName = profile?.email.split("@")[0] ?? "Carrier";

  const {
    control,
    formState: { errors, isDirty, isValid },
    handleSubmit,
    register,
    reset,
    watch,
  } = useForm<ProfileFormInput, unknown, ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: valuesFromProfile(null),
    mode: "onChange",
  });

  React.useEffect(() => {
    if (!profileQuery.data || isDirty) return;
    reset(valuesFromProfile(profileQuery.data.carrierProfile ?? null));
  }, [isDirty, profileQuery.data, reset]);

  React.useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  const watchedValues = watch();
  const previewProfile = React.useMemo<CarrierProfile>(
    () => mergePreviewProfile(carrierProfile, watchedValues),
    [carrierProfile, watchedValues],
  );
  const hasPendingPhoto = Boolean(cropSrc && completedCrop?.width && completedCrop?.height);

  const saveMutation = useMutation({
    mutationFn: async (values: ProfileFormValues): Promise<SaveProfileResult> => {
      const shouldUploadPhoto = Boolean(cropSrc && completedCrop?.width && completedCrop?.height);
      setUploadError(null);
      setUploadProgress(shouldUploadPhoto ? 0 : null);

      const savedProfile = await updateCarrierProfile(buildCarrierPayload(values));
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
              savedProfile.carrierProfile ?? null,
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
      reset(valuesFromProfile(data.carrierProfile ?? null));
      void queryClient.invalidateQueries({ queryKey: ["users"] });

      if (photoUploaded) {
        setCropSrc(null);
        setCrop(undefined);
        setCompletedCrop(undefined);
        setUploadProgress(100);
        setUploadError(null);
        pushToast("Carrier profile and photo saved.");
        return;
      }

      if (photoUploadError) {
        setUploadProgress(null);
        setUploadError(photoUploadError);
        pushToast("Profile saved, but photo upload failed.", "error");
        return;
      }

      setUploadProgress(null);
      pushToast("Carrier profile saved.");
    },
    onError: (error) => {
      setUploadProgress(null);
      pushToast(messageFromError(error, "Could not save carrier profile."), "error");
    },
  });

  const onSubmit = handleSubmit((values) => saveMutation.mutate(values));
  const canSave = (isDirty || hasPendingPhoto) && isValid && !saveMutation.isPending;

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

  if (profileQuery.isLoading) {
    return <ProfileSkeleton />;
  }

  if (profileQuery.isError) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-[--color-danger]/50 bg-[--color-danger]/10 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-red-200">
            Profile unavailable
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {messageFromError(profileQuery.error, "Could not load your profile.")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Carrier</p>
          <h1
            className="mt-1 text-2xl font-bold text-slate-100 sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Profile
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Control the carrier signals shippers see before they accept a bid.
          </p>
        </div>
        <PreviewToggle value={previewMode} onChange={setPreviewMode} />
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(280px,0.42fr)_minmax(0,1fr)]">
        <section className="space-y-4">
          <PhotoPanel
            crop={crop}
            cropSrc={cropSrc}
            completedCrop={completedCrop}
            displayName={displayName}
            isDragActive={isDragActive}
            isSaving={saveMutation.isPending}
            photoUrl={resolveUploadedPhotoUrl(carrierProfile?.profilePhotoUrl)}
            progress={uploadProgress}
            uploadError={uploadError}
            fileInputRef={fileInputRef}
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
            onSetCrop={setCrop}
            onSetCompletedCrop={setCompletedCrop}
            onSetDragActive={setIsDragActive}
          />
          <TrustScorePanel value={carrierProfile?.trustScore ?? 0} />
        </section>

        {previewMode === "mine" ? (
          <form className="space-y-4" noValidate onSubmit={onSubmit}>
            <DetailsPanel
              control={control}
              errors={errors}
              isSaving={saveMutation.isPending}
              canSave={canSave}
              register={register}
              bioLength={watchedValues.bio.length}
            />
            <StatsPanel profile={carrierProfile} />
          </form>
        ) : (
          <section className="space-y-4">
            <ShipperPreviewCard
              displayName={displayName}
              email={profile?.email ?? ""}
              profile={previewProfile}
            />
            <StatsPanel profile={previewProfile} />
          </section>
        )}
      </div>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}

function PhotoPanel({
  crop,
  cropSrc,
  completedCrop,
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
  completedCrop: PixelCrop | undefined;
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
    <section className="fm-panel-surface rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
          Photo
        </p>
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

function TrustScorePanel({ value }: { value: number }) {
  const score = clamp(value, 0, 100);
  const roundedScore = Math.round(score);
  return (
    <section className="fm-panel-muted rounded-lg p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Trust score
          </p>
          <p className="mt-3 font-mono text-5xl font-black tabular-nums text-slate-100">
            {roundedScore}
            <span className="text-lg text-slate-500">/100</span>
          </p>
        </div>
        <RadialProgress value={score} />
      </div>
    </section>
  );
}

function DetailsPanel({
  bioLength,
  canSave,
  control,
  errors,
  isSaving,
  register,
}: {
  bioLength: number;
  canSave: boolean;
  control: Control<ProfileFormInput, unknown, ProfileFormValues>;
  errors: FieldErrors<ProfileFormInput>;
  isSaving: boolean;
  register: UseFormRegister<ProfileFormInput>;
}) {
  return (
    <section className="fm-panel-surface rounded-lg p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">
            My view
          </p>
          <h2 className="mt-1 font-mono text-lg font-bold text-slate-100">Carrier details</h2>
        </div>
        <Button size="sm" type="submit" loading={isSaving} disabled={!canSave}>
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          Save
        </Button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="carrier-truck-type">Truck type</Label>
          <Controller
            control={control}
            name="truckType"
            render={({ field }) => (
              <Select
                value={isTruckType(field.value) ? field.value : ""}
                onValueChange={field.onChange}
              >
                <SelectTrigger id="carrier-truck-type">
                  <SelectValue placeholder="Select your type" />
                </SelectTrigger>
                <SelectContent>
                  {TRUCK_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {truckTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.truckType?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="carrier-capacity">Capacity kg</Label>
          <Input
            id="carrier-capacity"
            type="number"
            min={1}
            step={1}
            error={errors.capacityKg?.message}
            {...register("capacityKg", { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="carrier-home-city">Home city</Label>
          <Input
            id="carrier-home-city"
            placeholder="Istanbul"
            error={errors.homeCity?.message}
            {...register("homeCity")}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="carrier-bio">Bio</Label>
            <span className="font-mono text-[10px] tabular-nums text-slate-500">
              {bioLength}/{MAX_BIO_LENGTH}
            </span>
          </div>
          <textarea
            id="carrier-bio"
            rows={5}
            maxLength={MAX_BIO_LENGTH}
            aria-invalid={errors.bio ? true : undefined}
            className={cn(
              "fm-focus-ring w-full resize-y rounded-md border border-slate-700 bg-slate-800/95 px-3.5 py-3 text-sm leading-6 text-slate-100 placeholder:text-slate-500",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,box-shadow,background-color] duration-200",
              errors.bio &&
                "border-[color:var(--color-danger)] shadow-[0_0_0_1px_rgba(229,72,77,0.16),inset_0_1px_0_rgba(255,255,255,0.03)]",
            )}
            placeholder="Short operating summary, specialties, and regions served."
            {...register("bio")}
          />
          <FieldError message={errors.bio?.message} />
        </div>
      </div>
    </section>
  );
}

function StatsPanel({ profile }: { profile: CarrierProfile | null }) {
  return (
    <section className="fm-panel-muted rounded-lg p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Performance
        </p>
        <ShieldCheck className="h-4 w-4 text-[--color-go]" aria-hidden="true" />
      </div>
      <div className="mt-4 space-y-4">
        <StatBar
          label="Rating"
          value={profile?.rating ?? 0}
          max={5}
          unit="/5"
          maximumFractionDigits={1}
          tone="bg-amber-400"
        />
        <StatBar
          label="Completed"
          value={profile?.completedShipments ?? 0}
          max={100}
          unit="loads"
          tone="bg-[--color-go]"
        />
        <StatBar
          label="Avg ETA"
          value={profile?.avgEtaHours ?? 0}
          max={48}
          unit="h"
          maximumFractionDigits={1}
          tone="bg-[--color-transit]"
        />
      </div>
    </section>
  );
}

function ShipperPreviewCard({
  displayName,
  email,
  profile,
}: {
  displayName: string;
  email: string;
  profile: CarrierProfile;
}) {
  const photoUrl = resolveUploadedPhotoUrl(profile.profilePhotoUrl);
  const score = clamp(profile.trustScore ?? 0, 0, 100);
  const roundedScore = Math.round(score);

  return (
    <section className="fm-panel-surface rounded-lg p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">
            Shipper view
          </p>
          <h2 className="mt-1 font-mono text-lg font-bold text-slate-100">Bid card preview</h2>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-700 bg-slate-950/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
          Public
        </span>
      </div>

      <article className="mt-5 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-start gap-3">
          <Avatar name={displayName} photoUrl={photoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-semibold text-slate-100">{displayName}</p>
              <span className="rounded border border-[--color-go]/40 bg-[--color-go]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[--color-go]">
                Carrier
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">{email}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-slate-400">
              <span>
                {profile.truckType ? truckTypeLabels[profile.truckType] : "Truck type pending"}
              </span>
              {profile.homeCity ? <span>{profile.homeCity}</span> : null}
              <span>
                trust <span className="text-slate-200">{roundedScore}</span>
              </span>
              <span className="inline-flex items-center gap-0.5">
                <Star className="h-3 w-3 text-amber-400" aria-hidden="true" />
                <span className="text-slate-200">{(profile.rating ?? 0).toFixed(1)}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <PreviewMetric label="Capacity" value={profile.capacityKg ?? 0} unit="kg" />
          <PreviewMetric label="Avg ETA" value={profile.avgEtaHours ?? 0} unit="h" />
          <PreviewMetric label="Done" value={profile.completedShipments ?? 0} />
        </div>

        {profile.bio ? (
          <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">{profile.bio}</p>
        ) : (
          <p className="mt-4 text-sm leading-6 text-slate-500">No carrier bio yet.</p>
        )}
      </article>
    </section>
  );
}

function PreviewToggle({
  value,
  onChange,
}: {
  value: PreviewMode;
  onChange: (value: PreviewMode) => void;
}) {
  return (
    <div className="inline-flex w-fit rounded-lg border border-slate-800 bg-slate-900/70 p-1">
      {(["mine", "shipper"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={cn(
            "fm-focus-ring h-9 rounded-md px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors",
            value === mode
              ? "bg-amber-400 text-slate-950"
              : "text-slate-500 hover:bg-slate-800 hover:text-slate-200",
          )}
        >
          {mode === "mine" ? "My view" : "Shipper view"}
        </button>
      ))}
    </div>
  );
}

function RadialProgress({ value }: { value: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (value / 100) * circumference;

  return (
    <svg className="h-28 w-28 shrink-0" viewBox="0 0 112 112" aria-hidden="true">
      <circle
        cx="56"
        cy="56"
        r={radius}
        fill="none"
        stroke="rgba(42,52,65,0.95)"
        strokeWidth="10"
      />
      <circle
        cx="56"
        cy="56"
        r={radius}
        fill="none"
        stroke="rgb(245,179,66)"
        strokeLinecap="round"
        strokeWidth="10"
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: dashOffset,
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
        }}
      />
    </svg>
  );
}

function StatBar({
  label,
  max,
  maximumFractionDigits = 0,
  tone,
  unit,
  value,
}: {
  label: string;
  max: number;
  maximumFractionDigits?: number;
  tone: string;
  unit?: string;
  value: number;
}) {
  const pct = max > 0 ? Math.round((clamp(value, 0, max) / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <MonoNum
          value={value}
          unit={unit}
          maximumFractionDigits={maximumFractionDigits}
          className="text-sm text-slate-100"
        />
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"
      >
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PreviewMetric({ label, unit, value }: { label: string; unit?: string; value: number }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950/40 px-2.5 py-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <MonoNum value={value} unit={unit} maximumFractionDigits={unit === "h" ? 1 : 0} />
    </div>
  );
}

function Avatar({
  name,
  photoUrl,
  size = "md",
}: {
  name: string;
  photoUrl: string | null;
  size?: "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-14 w-14 text-sm" : "h-10 w-10 text-xs";
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className={cn("shrink-0 rounded-full border border-slate-700 object-cover", sizeClass)}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 font-mono text-slate-300",
        sizeClass,
      )}
    >
      {initialsFor(name)}
    </div>
  );
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label
      className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300"
      htmlFor={htmlFor}
    >
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-danger)]">
      {message}
    </p>
  );
}

function ProfileSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-3 w-28 animate-pulse rounded bg-slate-800" />
      <div className="mt-4 h-9 w-52 animate-pulse rounded bg-slate-800" />
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(280px,0.42fr)_minmax(0,1fr)]">
        <div className="h-[500px] animate-pulse rounded-lg bg-slate-900/60" />
        <div className="h-[500px] animate-pulse rounded-lg bg-slate-900/60" />
      </div>
    </main>
  );
}

function valuesFromProfile(profile: CarrierProfile | null): ProfileFormInput {
  return {
    truckType: profile?.truckType ?? UNSET_TRUCK_TYPE,
    capacityKg: profile?.capacityKg ?? 0,
    homeCity: profile?.homeCity ?? "",
    bio: profile?.bio ?? "",
  };
}

function buildCarrierPayload(values: ProfileFormValues): UpdateCarrierProfileInput {
  const bio = values.bio.trim();
  return {
    truckType: values.truckType,
    capacityKg: values.capacityKg,
    homeCity: values.homeCity.trim(),
    bio: bio.length > 0 ? bio : null,
  };
}

function mergePreviewProfile(
  profile: CarrierProfile | null,
  values: ProfileFormInput,
): CarrierProfile {
  return {
    truckType: isTruckType(values.truckType) ? values.truckType : undefined,
    capacityKg: Number.isFinite(values.capacityKg) ? values.capacityKg : 0,
    homeCity: values.homeCity.trim(),
    bio: values.bio.trim() || null,
    rating: profile?.rating ?? 0,
    completedShipments: profile?.completedShipments ?? 0,
    profilePhotoUrl: profile?.profilePhotoUrl ?? null,
    avgEtaHours: profile?.avgEtaHours ?? 0,
    trustScore: profile?.trustScore ?? 0,
  };
}

function mergePhotoIntoProfile(
  profile: ProfileResponse | null,
  carrierProfile: CarrierProfile | null,
  profilePhotoUrl: string,
): ProfileResponse | null {
  if (!profile || !carrierProfile) return null;
  return {
    ...profile,
    carrierProfile: {
      ...carrierProfile,
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
  return messageFromError(error, "Photo upload failed.");
}

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isTruckType(value: string): value is TruckType {
  return (TRUCK_TYPES as readonly string[]).includes(value);
}
