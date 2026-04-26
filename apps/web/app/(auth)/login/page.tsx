"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthShell } from "@/components/AuthShell";
import { useAuth } from "@/lib/hooks/useAuth";
import { login } from "@/lib/api/users";

const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginValues) => {
    try {
      const result = await login(data);
      setUser(result.user);
      const next = searchParams.get("next") ?? "";
      const destination =
        next.startsWith("/") && !next.startsWith("//")
          ? next
          : result.user.role === "Carrier"
            ? "/carrier/dashboard"
            : "/shipper/dashboard";
      router.push(destination);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 401) {
        setError("root", { message: "Invalid email or password." });
      } else {
        setError("root", { message: "Something went wrong. Please try again." });
      }
    }
  };

  return (
    <AuthShell subtitle="Sign in to your account">
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
            aria-describedby={errors.email ? "login-email-error" : undefined}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-amber-400"
            {...register("email")}
          />
          {errors.email ? (
            <p id="login-email-error" className="text-xs text-[--color-danger]">
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
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "login-password-error" : undefined}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-amber-400"
            {...register("password")}
          />
          {errors.password ? (
            <p id="login-password-error" className="text-xs text-[--color-danger]">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <p
          role="alert"
          aria-live="polite"
          className={`rounded border px-3 py-2 text-xs transition-all ${
            errors.root
              ? "border-[--color-danger]/40 bg-[--color-danger]/10 text-[--color-danger]"
              : "invisible border-transparent"
          }`}
        >
          {errors.root?.message ?? " "}
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded border border-amber-400 bg-amber-400/10 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </AuthShell>
  );
}
