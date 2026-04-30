"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { AlertCircle } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    // @ts-expect-error - zodResolver type mismatch with zod 4
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginValues) => {
    setErrorMsg(null);
    try {
      const res = await fetch("/api/proxy/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setErrorMsg("Invalid credentials.");
        } else {
          setErrorMsg("An error occurred during login.");
        }
        return;
      }

      const { user } = await res.json();
      
      if (nextParam) {
        router.push(nextParam);
      } else {
        // Redirect based on role
        if (user?.role === "Shipper") router.push("/shipper/dashboard");
        else if (user?.role === "Carrier") router.push("/carrier/dashboard");
        else router.push("/");
      }
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
          Secure Authentication
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
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />
        </div>

        <Button type="submit" loading={isSubmitting} className="mt-4 w-full">
          INITIALIZE_SESSION
        </Button>
      </form>

      <div className="text-center">
        <Link href="/register" className="font-mono text-xs text-amber-500 hover:text-amber-400 hover:underline transition-colors uppercase tracking-widest">
          Request Access Level
        </Link>
      </div>
    </div>
  );
}
