"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { AlertCircle, Box, Truck } from "lucide-react";
import { cn } from "@/lib/ui/cn";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["Shipper", "Carrier"] as const, {
    message: "Please select a role",
  }),
});

type RegisterValues = z.infer<typeof registerSchema>;

function calculateStrength(password: string) {
  let score = 0;
  if (!password) return 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score; // 0 to 4
}

export default function RegisterPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    // @ts-expect-error - zodResolver type mismatch with zod 4
    resolver: zodResolver(registerSchema),
  });

  const passwordVal = watch("password", "");
  const strength = calculateStrength(passwordVal);

  const onSubmit = async (data: RegisterValues) => {
    setErrorMsg(null);
    try {
      const res = await fetch("/api/proxy/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setErrorMsg(body?.message || "Registration failed. Please try again.");
        return;
      }

      const loginRes = await fetch("/api/proxy/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      if (!loginRes.ok) {
        router.push("/login");
        return;
      }

      if (data.role === "Shipper") router.push("/shipper/dashboard");
      else if (data.role === "Carrier") router.push("/carrier/dashboard");
    } catch (err) {
      setErrorMsg("Network error occurred.");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-2xl font-bold tracking-widest text-amber-400">
          FREIGHTMATCH<span className="text-slate-500"> // </span>OPS
        </h1>
        <p className="font-mono text-xs text-slate-400 uppercase tracking-widest">
          New Operative Registration
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded bg-danger/10 border border-[var(--color-danger)] p-3 text-sm text-[var(--color-danger)]" role="alert">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="font-mono text-xs text-slate-300 uppercase tracking-widest pl-1">
            Email Identity
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="operative@domain.com"
            error={errors.email?.message}
            {...register("email")}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="font-mono text-xs text-slate-300 uppercase tracking-widest pl-1">
            Access Cipher
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />
          {passwordVal && (
            <div className="mt-2 flex items-center gap-2 pl-1">
              <div className="flex flex-1 gap-1 h-1.5">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      "flex-1 rounded-full transition-colors duration-300",
                      level <= strength
                        ? strength <= 2
                          ? "bg-[var(--color-danger)]"
                          : strength === 3
                            ? "bg-amber-400"
                            : "bg-[var(--color-go)]"
                        : "bg-slate-700"
                    )}
                  />
                ))}
              </div>
              <span className="font-mono text-[10px] text-slate-400 uppercase w-16 text-right">
                {strength <= 1 ? "WEAK" : strength === 2 ? "FAIR" : strength === 3 ? "GOOD" : "STRONG"}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="font-mono text-xs text-slate-300 uppercase tracking-widest pl-1" id="role-label">
            Operational Role
          </label>
          <Controller<RegisterValues, "role">
            name="role"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby="role-label">
                <button
                  type="button"
                  role="radio"
                  aria-checked={field.value === "Shipper"}
                  onClick={() => field.onChange("Shipper")}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-lg border p-4 text-left transition-all duration-200 fm-focus-ring",
                    field.value === "Shipper"
                      ? "border-amber-400 bg-amber-400/10 shadow-[inset_0_0_20px_rgba(245,179,66,0.1)]"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-500"
                  )}
                >
                  <Box className={cn("h-8 w-8", field.value === "Shipper" ? "text-amber-400" : "text-slate-400")} />
                  <div className="text-center">
                    <div className={cn("font-bold font-mono uppercase tracking-wider text-sm", field.value === "Shipper" ? "text-amber-400" : "text-slate-300")}>Shipper</div>
                    <div className="text-[10px] text-slate-500 mt-1">I have freight to move.</div>
                  </div>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={field.value === "Carrier"}
                  onClick={() => field.onChange("Carrier")}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-lg border p-4 text-left transition-all duration-200 fm-focus-ring",
                    field.value === "Carrier"
                      ? "border-amber-400 bg-amber-400/10 shadow-[inset_0_0_20px_rgba(245,179,66,0.1)]"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-500"
                  )}
                >
                  <Truck className={cn("h-8 w-8", field.value === "Carrier" ? "text-amber-400" : "text-slate-400")} />
                  <div className="text-center">
                    <div className={cn("font-bold font-mono uppercase tracking-wider text-sm", field.value === "Carrier" ? "text-amber-400" : "text-slate-300")}>Carrier</div>
                    <div className="text-[10px] text-slate-500 mt-1">I have trucks to fill.</div>
                  </div>
                </button>
              </div>
            )}
          />
          {errors.role && (
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-danger)]">
              {errors.role.message}
            </p>
          )}
        </div>

        <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
          PROVISION_ACCESS
        </Button>
      </form>

      <div className="text-center">
        <Link href="/login" className="font-mono text-xs text-amber-500 hover:text-amber-400 hover:underline transition-colors uppercase tracking-widest">
          Return to Login
        </Link>
      </div>
    </div>
  );
}
