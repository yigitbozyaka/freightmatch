"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type FieldErrors, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Loader2, MapPin, Package, Send } from "lucide-react";
import { RouteMap } from "@/components/maps/RouteMap";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { ToastHost, useToastQueue } from "@/components/primitives/ToastHost";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { cn } from "@/lib/ui/cn";
import * as loadsApi from "@/lib/api/loads";

const STORAGE_KEY = "fm:new-load-wizard:v1";

const CARGO_OPTIONS = [
  { value: "general", label: "General" },
  { value: "refrigerated", label: "Refrigerated" },
  { value: "hazmat", label: "Hazmat" },
  { value: "fragile", label: "Fragile" },
  { value: "oversized", label: "Oversized" },
] as const;
const CARGO_VALUES = CARGO_OPTIONS.map((c) => c.value) as [string, ...string[]];

const formSchema = z.object({
  origin: z.string().trim().min(2, "Origin city is required"),
  destination: z.string().trim().min(2, "Destination is required"),
  title: z.string().trim().min(2, "Title must be at least 2 characters"),
  cargoType: z.enum(CARGO_VALUES),
  weightKg: z.number({ message: "Weight is required" }).positive("Weight must be greater than 0"),
  deadlineHours: z
    .number({ message: "Deadline is required" })
    .int()
    .positive("Deadline must be a positive number of hours"),
});

type FormValues = z.infer<typeof formSchema>;

const STEP_FIELDS: Array<readonly (keyof FormValues)[]> = [
  ["origin", "destination"],
  ["title", "cargoType", "weightKg"],
  ["deadlineHours"],
  [],
];

const STEP_LABELS = ["Route", "Cargo", "Schedule", "Review"] as const;

const DEFAULT_VALUES: FormValues = {
  origin: "",
  destination: "",
  title: "",
  cargoType: "general",
  weightKg: 0,
  deadlineHours: 24,
};

export default function NewLoadWizardPage() {
  const router = useRouter();
  const { toasts, pushToast, dismissToast } = useToastQueue();

  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState<"draft" | "post" | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FormValues> & { step?: number };
        const { step: savedStep, ...values } = parsed;
        form.reset({ ...DEFAULT_VALUES, ...values });
        if (typeof savedStep === "number" && savedStep >= 0 && savedStep <= 3) {
          setStep(savedStep);
        }
      }
    } catch {
      /* corrupt sessionStorage */
    }
    setHydrated(true);
  }, [form]);

  const watched = form.watch();
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...form.getValues(), step }));
    } catch {
      /* quota exceeded */
    }
    const subscription = form.watch((values) => {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...values, step }));
      } catch {
        /* quota exceeded */
      }
    });
    return () => subscription.unsubscribe();
  }, [form, hydrated, step]);

  const goNext = React.useCallback(async () => {
    const fields = STEP_FIELDS[step];
    if (fields.length > 0) {
      const valid = await form.trigger(fields as Parameters<typeof form.trigger>[0]);
      if (!valid) return;
    }
    setStep((s) => Math.min(3, s + 1));
  }, [form, step]);

  const goBack = React.useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const buildPayload = (values: FormValues): loadsApi.CreateLoadInput => ({
    title: values.title.trim(),
    origin: values.origin.trim(),
    destination: values.destination.trim(),
    cargoType: values.cargoType,
    weightKg: Number(values.weightKg),
    deadlineHours: Number(values.deadlineHours),
  });

  const clearStorage = () => {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* */
    }
  };

  const onSaveDraft = async () => {
    const valid = await form.trigger();
    if (!valid) {
      pushToast("Fix the highlighted fields before saving.", "error");
      return;
    }
    setSubmitting("draft");
    try {
      const created = await loadsApi.createLoad(buildPayload(form.getValues()));
      clearStorage();
      pushToast("Draft saved.");
      router.push(`/shipper/loads/${created._id}`);
    } catch (err) {
      pushToast(messageFromError(err, "Could not save draft."), "error");
      setSubmitting(null);
    }
  };

  const onPostNow = async () => {
    const valid = await form.trigger();
    if (!valid) {
      pushToast("Fix the highlighted fields before posting.", "error");
      return;
    }
    setSubmitting("post");
    try {
      const created = await loadsApi.createLoad(buildPayload(form.getValues()));
      await loadsApi.updateStatus(created._id, "Posted");
      clearStorage();
      pushToast("Load posted.");
      router.push(`/shipper/loads/${created._id}`);
    } catch (err) {
      pushToast(messageFromError(err, "Could not post load."), "error");
      setSubmitting(null);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName.toLowerCase() ?? "";
    if (event.key === "Enter" && tag !== "textarea" && tag !== "button") {
      event.preventDefault();
      if (step < 3) void goNext();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (step > 0) goBack();
    }
  };

  const errors = form.formState.errors;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Shipper</p>
        <h1
          className="mt-1 text-2xl font-bold text-slate-100 sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Post a new load
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Four quick steps. Carriers will see this lane the moment you hit{" "}
          <span className="font-mono text-amber-300">POST</span>.
        </p>
      </header>

      <ProgressBar step={step} />

      <form
        className="mt-6 grid grid-cols-12 gap-4"
        onKeyDown={onKeyDown}
        onSubmit={(e) => e.preventDefault()}
      >
        <section className="col-span-12 lg:col-span-7">
          <div className="fm-panel-surface rounded-xl px-5 py-5 sm:px-6 sm:py-6">
            {step === 0 ? (
              <RouteStep form={form} />
            ) : step === 1 ? (
              <CargoStep form={form} />
            ) : step === 2 ? (
              <ScheduleStep form={form} />
            ) : (
              <ReviewStep values={form.getValues()} />
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={step === 0 || submitting !== null}
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </Button>

            <div className="flex items-center gap-3">
              {step < 3 ? (
                <Button onClick={goNext} disabled={submitting !== null}>
                  Next <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={onSaveDraft}
                    loading={submitting === "draft"}
                    disabled={submitting !== null}
                  >
                    Save as draft
                  </Button>
                  <Button
                    onClick={onPostNow}
                    loading={submitting === "post"}
                    disabled={submitting !== null}
                  >
                    <Send className="h-4 w-4" aria-hidden /> Post now
                  </Button>
                </>
              )}
            </div>
          </div>

          {Object.keys(errors).length > 0 && step === 3 ? (
            <ErrorBanner errors={errors} onJump={(s) => setStep(s)} />
          ) : null}
        </section>

        <aside className="col-span-12 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <SectionHeader label="Live preview" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              {step === 3 ? "Final" : "Updates as you type"}
            </span>
          </div>
          <RouteMap
            origin={watched.origin || ""}
            destination={watched.destination || ""}
            height="280px"
          />
          {step === 3 ? (
            <DistanceCard origin={watched.origin} destination={watched.destination} />
          ) : null}
        </aside>
      </form>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

const HAZARD_STRIPES_STYLE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, #f5b342 0, #f5b342 6px, #1c2430 6px, #1c2430 12px)",
};

function ProgressBar({ step }: { step: number }) {
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Wizard progress">
      {STEP_LABELS.map((label, index) => {
        const state = index < step ? "done" : index === step ? "active" : "todo";
        return (
          <li key={label} className="flex flex-col gap-1.5">
            <div
              aria-current={state === "active" ? "step" : undefined}
              style={state === "active" ? HAZARD_STRIPES_STYLE : undefined}
              className={cn(
                "h-2 rounded-sm border",
                state === "done" && "border-amber-400/50 bg-amber-400/70",
                state === "active" && "border-amber-400",
                state === "todo" && "border-slate-700 bg-slate-800/60",
              )}
            />
            <p
              className={cn(
                "font-mono text-[10px] uppercase tracking-[0.2em]",
                state === "done" && "text-amber-300/80",
                state === "active" && "text-amber-300",
                state === "todo" && "text-slate-500",
              )}
            >
              {String(index + 1).padStart(2, "0")} · {label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function RouteStep({ form }: { form: UseFormReturn<FormValues> }) {
  const { register, formState, setValue, watch } = form;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-amber-400" aria-hidden />
        <h2 className="font-mono text-sm uppercase tracking-[0.18em] text-slate-200">Route</h2>
      </div>
      <FieldLabel htmlFor="origin" label="Origin city" />
      <CityAutocomplete
        id="origin"
        value={watch("origin")}
        onChange={(v) => setValue("origin", v, { shouldValidate: true, shouldDirty: true })}
        placeholder="e.g. Chicago, IL"
        error={formState.errors.origin?.message}
        registerProps={register("origin")}
      />
      <FieldLabel htmlFor="destination" label="Destination city" />
      <CityAutocomplete
        id="destination"
        value={watch("destination")}
        onChange={(v) => setValue("destination", v, { shouldValidate: true, shouldDirty: true })}
        placeholder="e.g. Dallas, TX"
        error={formState.errors.destination?.message}
        registerProps={register("destination")}
      />
    </div>
  );
}

function CargoStep({ form }: { form: UseFormReturn<FormValues> }) {
  const { register, formState, control } = form;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-amber-400" aria-hidden />
        <h2 className="font-mono text-sm uppercase tracking-[0.18em] text-slate-200">Cargo</h2>
      </div>
      <FieldLabel htmlFor="title" label="Title" />
      <Input
        id="title"
        placeholder="e.g. Refrigerated produce — Chicago to Dallas"
        error={formState.errors.title?.message}
        {...register("title")}
      />

      <FieldLabel htmlFor="cargoType" label="Cargo type" />
      <Controller
        control={control}
        name="cargoType"
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="cargoType">
              <SelectValue placeholder="Pick a cargo type" />
            </SelectTrigger>
            <SelectContent>
              {CARGO_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      <FieldLabel htmlFor="weightKg" label="Weight (kg)" />
      <Input
        id="weightKg"
        type="number"
        inputMode="decimal"
        min={0}
        placeholder="e.g. 18000"
        error={formState.errors.weightKg?.message}
        {...register("weightKg", { valueAsNumber: true })}
      />
    </div>
  );
}

function ScheduleStep({ form }: { form: UseFormReturn<FormValues> }) {
  const { register, formState } = form;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span aria-hidden className="font-mono text-amber-400">
          ⏱
        </span>
        <h2 className="font-mono text-sm uppercase tracking-[0.18em] text-slate-200">Schedule</h2>
      </div>
      <FieldLabel htmlFor="deadlineHours" label="Deadline (hours)" />
      <Input
        id="deadlineHours"
        type="number"
        inputMode="numeric"
        min={1}
        placeholder="e.g. 48"
        error={formState.errors.deadlineHours?.message}
        {...register("deadlineHours", { valueAsNumber: true })}
      />
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
        Hours from now until the load must be delivered.
      </p>
    </div>
  );
}

function ReviewStep({ values }: { values: FormValues }) {
  const cargoLabel =
    CARGO_OPTIONS.find((c) => c.value === values.cargoType)?.label ?? values.cargoType;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span aria-hidden className="font-mono text-amber-400">
          ✓
        </span>
        <h2 className="font-mono text-sm uppercase tracking-[0.18em] text-slate-200">Review</h2>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <ReviewRow label="Title" value={values.title || "—"} />
        <ReviewRow label="Cargo" value={cargoLabel} />
        <ReviewRow label="Origin" value={values.origin || "—"} />
        <ReviewRow label="Destination" value={values.destination || "—"} />
        <ReviewRow
          label="Weight"
          value={Number.isFinite(values.weightKg) ? `${values.weightKg.toLocaleString()} kg` : "—"}
        />
        <ReviewRow label="Deadline" value={`${values.deadlineHours} hours`} />
      </dl>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-slate-800/70 pt-2">
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-100">{value}</dd>
    </div>
  );
}

function FieldLabel({ htmlFor, label }: { htmlFor: string; label: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400"
    >
      {label}
    </label>
  );
}

function ErrorBanner({
  errors,
  onJump,
}: {
  errors: FieldErrors<FormValues>;
  onJump: (step: number) => void;
}) {
  const firstStep = STEP_FIELDS.findIndex((fields) =>
    fields.some((f) => Boolean(errors[f as keyof FormValues])),
  );
  return (
    <div className="mt-3 rounded-md border border-[var(--color-danger)]/60 bg-[rgba(229,72,77,0.06)] px-3 py-2">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-danger)]">
        Some fields need attention.
      </p>
      {firstStep >= 0 ? (
        <button
          type="button"
          onClick={() => onJump(firstStep)}
          className="mt-1 font-mono text-xs text-amber-300 underline-offset-2 hover:underline"
        >
          Jump to step {firstStep + 1} ({STEP_LABELS[firstStep]})
        </button>
      ) : null}
    </div>
  );
}

type NominatimSuggestion = { display_name: string; lat: string; lon: string };

function CityAutocomplete({
  id,
  value,
  onChange,
  placeholder,
  error,
  registerProps,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  registerProps: ReturnType<ReturnType<typeof useForm<FormValues>>["register"]>;
}) {
  const [suggestions, setSuggestions] = React.useState<NominatimSuggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [highlight, setHighlight] = React.useState(-1);
  const errorId = error ? `${id}-error` : undefined;
  const listboxId = `${id}-listbox`;
  const optionId = (i: number) => `${id}-opt-${i}`;

  React.useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        const results = await searchNominatim(trimmed);
        if (!cancelled) {
          setSuggestions(results);
          setHighlight(results.length > 0 ? 0 : -1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [value]);

  const commit = (s: NominatimSuggestion) => {
    onChange(s.display_name);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        id={id}
        autoComplete="off"
        placeholder={placeholder}
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={
          open && highlight >= 0 && suggestions[highlight] ? optionId(highlight) : undefined
        }
        role="combobox"
        className={cn(
          "fm-focus-ring w-full rounded-md border bg-slate-800/95 px-3.5 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-500",
          "border-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,box-shadow,background-color] duration-200",
          error && "border-[var(--color-danger)]",
        )}
        value={value}
        name={registerProps.name}
        ref={registerProps.ref}
        onBlur={(e) => {
          registerProps.onBlur(e);
          setTimeout(() => setOpen(false), 120);
        }}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => (h + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
          } else if (e.key === "Enter" && highlight >= 0) {
            e.preventDefault();
            e.stopPropagation();
            commit(suggestions[highlight]);
          } else if (e.key === "Escape") {
            e.stopPropagation();
            setOpen(false);
          }
        }}
      />
      {open && (loading || suggestions.length > 0) ? (
        <ul
          id={listboxId}
          role="listbox"
          className="fm-panel-surface absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-md p-1"
        >
          {loading && suggestions.length === 0 ? (
            <li className="flex items-center gap-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Searching…
            </li>
          ) : null}
          {suggestions.map((s, i) => (
            <li
              key={`${s.lat},${s.lon}`}
              id={optionId(i)}
              role="option"
              aria-selected={i === highlight}
            >
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(s);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "block w-full rounded-sm px-3 py-2 text-left text-xs",
                  i === highlight
                    ? "bg-amber-400/15 text-amber-100"
                    : "text-slate-200 hover:bg-amber-400/10 hover:text-amber-200",
                )}
              >
                {s.display_name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p
          className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-danger)]"
          id={errorId}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function DistanceCard({ origin, destination }: { origin: string; destination: string }) {
  const [distanceKm, setDistanceKm] = React.useState<number | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    const a = origin.trim();
    const b = destination.trim();
    if (a.length < 2 || b.length < 2) {
      setDistanceKm(null);
      return;
    }
    let cancelled = false;
    setPending(true);
    void Promise.all([geocode(a), geocode(b)])
      .then(([oc, dc]) => {
        if (cancelled) return;
        if (!oc || !dc) {
          setDistanceKm(null);
          return;
        }
        setDistanceKm(haversineKm(oc, dc));
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [origin, destination]);

  return (
    <div className="fm-panel-muted mt-3 rounded-lg px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
        Estimated distance
      </p>
      <p className="mt-1 font-mono text-lg text-slate-100">
        {pending && distanceKm === null
          ? "Calculating…"
          : distanceKm === null
            ? "—"
            : `${Math.round(distanceKm).toLocaleString()} km`}
      </p>
    </div>
  );
}

const searchMemo = new Map<string, Promise<NominatimSuggestion[]>>();

function searchNominatim(query: string): Promise<NominatimSuggestion[]> {
  const key = query.trim().toLowerCase();
  if (!key) return Promise.resolve([]);
  const cached = searchMemo.get(key);
  if (cached) return cached;
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: query.trim(),
    format: "jsonv2",
    limit: "5",
    addressdetails: "0",
  }).toString()}`;
  const request = fetch(url, { headers: { Accept: "application/json" } })
    .then(async (response) => {
      if (!response.ok) return [] as NominatimSuggestion[];
      const payload = (await response.json()) as NominatimSuggestion[];
      return Array.isArray(payload) ? payload : [];
    })
    .catch(() => [] as NominatimSuggestion[]);
  searchMemo.set(key, request);
  return request;
}

function geocode(value: string): Promise<{ lat: number; lng: number } | null> {
  return searchNominatim(value).then((results) => {
    const first = results[0];
    if (!first) return null;
    const lat = Number.parseFloat(String(first.lat ?? ""));
    const lng = Number.parseFloat(String(first.lon ?? ""));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  });
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function messageFromError(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
