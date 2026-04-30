"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthShell } from "../_components/auth-shell";
import { dashboardForRole } from "../_lib/redirects";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { cn } from "@/lib/ui/cn";
import { login, register as registerUser } from "@/lib/api/users";
import { useAuth } from "@/lib/hooks/useAuth";

const passwordRules = [
  { label: "8+ characters", test: (value: string) => value.length >= 8 },
  { label: "Uppercase", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Lowercase", test: (value: string) => /[a-z]/.test(value) },
  { label: "Number", test: (value: string) => /[0-9]/.test(value) },
  {
    label: "Special",
    test: (value: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value),
  },
] as const;

const registerSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[A-Z]/, "Include an uppercase letter.")
    .regex(/[a-z]/, "Include a lowercase letter.")
    .regex(/[0-9]/, "Include a number.")
    .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, "Include a special character."),
  role: z.enum(["Shipper", "Carrier"], {
    message: "Choose Shipper or Carrier.",
  }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const roleOptions = [
  {
    description: "Post freight, compare bids, and coordinate your lanes.",
    icon: Building2,
    label: "Shipper",
    value: "Shipper",
  },
  {
    description: "Find posted loads, bid fast, and manage carrier ops.",
    icon: Truck,
    label: "Carrier",
    value: "Carrier",
  },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    watch,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", role: undefined },
  });

  const password = watch("password");
  const selectedRole = watch("role");
  const passedRules = passwordRules.filter((rule) => rule.test(password ?? "")).length;

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null);

    try {
      await registerUser(values);
      const result = await login({ email: values.email, password: values.password });
      setUser(result.user);
      router.replace(dashboardForRole(result.user.role));
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to create the account right now.",
      );
    }
  }

  const formErrorId = formError ? "register-form-error" : undefined;
  const roleErrorId = errors.role ? "register-role-error" : undefined;

  return (
    <AuthShell
      eyebrow="Provision ops account"
      footerHref="/login"
      footerLabel="Sign in"
      footerText="Already cleared for access?"
      heading="Create account"
      subheading="Create the account profile that determines which FreightMatch console you enter."
    >
      <form
        aria-describedby={formErrorId}
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
      >
        {formError ? (
          <p
            className="rounded-md border border-[color:var(--color-danger)]/45 bg-[color:var(--color-danger)]/10 px-3.5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-red-200"
            id={formErrorId}
            role="alert"
          >
            {formError}
          </p>
        ) : null}

        <div className="space-y-2">
          <label
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300"
            htmlFor="register-email"
          >
            Email
          </label>
          <Input
            autoComplete="username"
            error={errors.email?.message}
            id="register-email"
            placeholder="ops@freightmatch.io"
            type="email"
            {...register("email")}
          />
        </div>

        <div className="space-y-2">
          <label
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300"
            htmlFor="register-password"
          >
            Password
          </label>
          <Input
            autoComplete="new-password"
            error={errors.password?.message}
            id="register-password"
            placeholder="Shipper123!"
            type="password"
            {...register("password")}
          />
          <div aria-hidden="true" className="grid grid-cols-5 gap-1">
            {passwordRules.map((rule, index) => (
              <span
                className={cn(
                  "h-1 rounded-full bg-slate-700",
                  index < passedRules && "bg-amber-400",
                )}
                key={rule.label}
              />
            ))}
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Password requirements">
            {passwordRules.map((rule) => {
              const passed = rule.test(password ?? "");
              return (
                <li
                  className={cn(
                    "rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em]",
                    passed
                      ? "border-[color:var(--color-go)]/50 text-[var(--color-go)]"
                      : "border-slate-700 text-slate-500",
                  )}
                  key={rule.label}
                >
                  {rule.label}
                </li>
              );
            })}
          </ul>
        </div>

        <fieldset aria-describedby={roleErrorId} className="space-y-3">
          <legend className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
            Role
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {roleOptions.map((option) => {
              const Icon = option.icon;
              const checked = selectedRole === option.value;

              return (
                <label
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-4 rounded-md border border-slate-700 bg-slate-900/70 p-4 transition-[border-color,background-color,box-shadow] focus-within:border-amber-400 focus-within:shadow-[0_0_0_1px_rgba(245,179,66,0.95),0_0_0_4px_rgba(245,179,66,0.16)]",
                    checked &&
                      "border-amber-400 bg-amber-400/10 shadow-[0_0_0_1px_rgba(245,179,66,0.28)]",
                  )}
                  htmlFor={`register-role-${option.value.toLowerCase()}`}
                  key={option.value}
                >
                  <input
                    className="absolute inset-0 cursor-pointer opacity-0"
                    id={`register-role-${option.value.toLowerCase()}`}
                    type="radio"
                    value={option.value}
                    {...register("role")}
                  />
                  <span className="flex items-center justify-between gap-3">
                    <Icon
                      aria-hidden="true"
                      className={cn("h-6 w-6 text-slate-400", checked && "text-amber-400")}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-3 w-3 rounded-full border border-slate-600",
                        checked && "border-amber-400 bg-amber-400",
                      )}
                    />
                  </span>
                  <span>
                    <span className="block font-mono text-sm font-semibold uppercase tracking-[0.2em] text-slate-100">
                      {option.label}
                    </span>
                    <span className="mt-2 block text-sm leading-5 text-slate-400">
                      {option.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {errors.role ? (
            <p
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-danger)]"
              id={roleErrorId}
            >
              {errors.role.message}
            </p>
          ) : null}
        </fieldset>

        <Button className="w-full" loading={isSubmitting} size="lg" type="submit">
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
