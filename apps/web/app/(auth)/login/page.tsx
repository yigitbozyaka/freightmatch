"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthShell } from "../_components/auth-shell";
import { dashboardForRole, safeNext } from "../_lib/redirects";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { ApiResponseError } from "@/lib/api/client";
import { login } from "@/lib/api/users";
import { useAuth } from "@/lib/hooks/useAuth";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);

    try {
      const result = await login(values);
      setUser(result.user);
      const nextPath = safeNext(searchParams.get("next"));
      router.replace(nextPath ?? dashboardForRole(result.user.role));
      router.refresh();
    } catch (error) {
      if (error instanceof ApiResponseError && error.status === 401) {
        setFormError("Invalid email or password.");
        return;
      }

      setFormError(error instanceof Error ? error.message : "Unable to sign in right now.");
    }
  }

  const formErrorId = formError ? "login-form-error" : undefined;

  return (
    <AuthShell
      eyebrow="Secure console access"
      footerHref="/register"
      footerLabel="Create account"
      footerText="New to FreightMatch?"
      heading="Sign in"
      subheading="Authenticate into the freight command surface with your shipper or carrier account."
    >
      <form
        aria-describedby={formErrorId}
        className="space-y-4"
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
            htmlFor="login-email"
          >
            Email
          </label>
          <Input
            autoComplete="username"
            error={errors.email?.message}
            id="login-email"
            placeholder="dispatch@freightmatch.io"
            type="email"
            {...register("email")}
          />
        </div>

        <div className="space-y-2">
          <label
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300"
            htmlFor="login-password"
          >
            Password
          </label>
          <Input
            autoComplete="current-password"
            error={errors.password?.message}
            id="login-password"
            placeholder="••••••••"
            type="password"
            {...register("password")}
          />
        </div>

        <Button className="w-full" loading={isSubmitting} size="lg" type="submit">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
