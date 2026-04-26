"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthShell } from "@/components/AuthShell";
import { useAuth } from "@/lib/hooks/useAuth";
import { login, register } from "@/lib/api/users";

const RegisterSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["Shipper", "Carrier"]),
});

type RegisterValues = z.infer<typeof RegisterSchema>;

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return { label: "Weak", color: "bg-[--color-danger]", width: "w-1/4" };
  if (score <= 2) return { label: "Fair", color: "bg-amber-500", width: "w-2/4" };
  if (score <= 3) return { label: "Good", color: "bg-[--color-transit]", width: "w-3/4" };
  return { label: "Strong", color: "bg-[--color-go]", width: "w-full" };
}

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { email: "", password: "", role: "Shipper" },
  });

  const password = watch("password");
  const role = watch("role");
  const strength = useMemo(() => getPasswordStrength(password ?? ""), [password]);

  const onSubmit = async (data: RegisterValues) => {
    try {
      await register(data);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        setError("email", { message: "An account with this email already exists." });
      } else {
        setError("root", { message: "Registration failed. Please try again." });
      }
      return;
    }
    try {
      const loginResult = await login({ email: data.email, password: data.password });
      setUser(loginResult.user);
      router.push(
        loginResult.user.role === "Carrier" ? "/carrier/dashboard" : "/shipper/dashboard",
      );
    } catch {
      setError("root", { message: "Account created! Please sign in." });
    }
  };

  return (
    <AuthShell subtitle="Create operator account">
      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="font-mono text-xs uppercase tracking-widest text-slate-300"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "register-email-error" : undefined}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-amber-400"
            {...register("email")}
          />
          {errors.email ? (
            <p id="register-email-error" className="text-xs text-[--color-danger]">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="font-mono text-xs uppercase tracking-widest text-slate-300"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? "register-password-error password-strength" : "password-strength"
            }
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-amber-400"
            {...register("password")}
          />
          {errors.password ? (
            <p id="register-password-error" className="text-xs text-[--color-danger]">
              {errors.password.message}
            </p>
          ) : null}
          <div
            id="password-strength"
            className="space-y-1"
            role="progressbar"
            aria-valuenow={
              strength.label === "Weak"
                ? 25
                : strength.label === "Fair"
                  ? 50
                  : strength.label === "Good"
                    ? 75
                    : 100
            }
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Password strength: ${strength.label}`}
          >
            <div className="h-1.5 w-full overflow-hidden rounded bg-slate-800">
              <div className={`h-full ${strength.width} ${strength.color} transition-all`} />
            </div>
            <p className="font-mono text-[11px] text-slate-400">Strength: {strength.label}</p>
          </div>
        </div>

        <fieldset
          className="space-y-2"
          aria-describedby={errors.role ? "register-role-error" : undefined}
        >
          <legend className="font-mono text-xs uppercase tracking-widest text-slate-300">
            Role
          </legend>
          <div className="grid gap-3 md:grid-cols-2">
            <label
              htmlFor="role-shipper"
              className={`cursor-pointer rounded border p-4 text-left transition ${role === "Shipper" ? "border-amber-400 bg-amber-400/10" : "border-slate-700 bg-slate-900 hover:border-slate-500"}`}
            >
              <input
                id="role-shipper"
                type="radio"
                value="Shipper"
                checked={role === "Shipper"}
                onChange={() => setValue("role", "Shipper")}
                className="sr-only"
              />
              <p className="font-mono text-sm text-slate-100">
                <span aria-hidden="true">🏭 </span>Shipper
              </p>
              <p className="mt-1 text-xs text-slate-400">Post loads fast and track bids.</p>
            </label>
            <label
              htmlFor="role-carrier"
              className={`cursor-pointer rounded border p-4 text-left transition ${role === "Carrier" ? "border-amber-400 bg-amber-400/10" : "border-slate-700 bg-slate-900 hover:border-slate-500"}`}
            >
              <input
                id="role-carrier"
                type="radio"
                value="Carrier"
                checked={role === "Carrier"}
                onChange={() => setValue("role", "Carrier")}
                className="sr-only"
              />
              <p className="font-mono text-sm text-slate-100">
                <span aria-hidden="true">🚚 </span>Carrier
              </p>
              <p className="mt-1 text-xs text-slate-400">Discover freight and bid fast.</p>
            </label>
          </div>
          {errors.role ? (
            <p id="register-role-error" className="text-xs text-[--color-danger]">
              {errors.role.message}
            </p>
          ) : null}
        </fieldset>

        <p
          role="alert"
          aria-live="polite"
          className={`rounded border px-3 py-2 text-xs transition-all ${errors.root ? "border-[--color-danger]/40 bg-[--color-danger]/10 text-[--color-danger]" : "invisible border-transparent"}`}
        >
          {errors.root?.message ?? " "}
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded border border-amber-400 bg-amber-400/10 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Creating account..." : "Create Account"}
        </button>
      </form>
    </AuthShell>
  );
}
