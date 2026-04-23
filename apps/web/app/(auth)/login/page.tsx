'use client';

import { type FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { GridBackdrop } from '@/components/GridBackdrop';
import { useAuth } from '@/lib/hooks/useAuth';
import { ApiResponseError } from '@/lib/api/client';
import { login } from '@/lib/api/users';

const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginValues = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const [values, setValues] = useState<LoginValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginValues, string>>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const next = searchParams.get('next');

  const handleChange = (field: keyof LoginValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = LoginSchema.safeParse(values);

    if (!parsed.success) {
      const formErrors: Partial<Record<keyof LoginValues, string>> = {};
      const flattened = parsed.error.flatten().fieldErrors;
      if (flattened.email?.[0]) formErrors.email = flattened.email[0];
      if (flattened.password?.[0]) formErrors.password = flattened.password[0];
      setErrors(formErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(parsed.data);
      setUser(result.user);

      if (next?.startsWith('/')) {
        router.push(next);
        return;
      }

      router.push(result.user.role === 'Carrier' ? '/carrier/dashboard' : '/shipper/dashboard');
    } catch (error) {
      if (error instanceof ApiResponseError && error.status === 401) {
        setSubmitError('Invalid email or password.');
      } else {
        setSubmitError('Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6 py-10">
      <GridBackdrop />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,179,66,0.08),transparent_55%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_0.5px,transparent_0.5px)] [background-size:3px_3px]" />

      <section className="relative z-10 w-full max-w-md rounded-xl border border-slate-800 bg-slate-950/90 p-7 shadow-[0_0_80px_rgba(0,0,0,0.45)]">
        <p className="font-mono text-xs tracking-[0.2em] text-amber-400 uppercase">FreightMatch</p>
        <h1 className="mt-2 text-3xl font-black text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>
          FREIGHTMATCH // OPS
        </h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-wider text-slate-400">Sign in to console</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <label htmlFor="email" className="font-mono text-xs uppercase tracking-widest text-slate-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={values.email}
              onChange={(e) => handleChange('email', e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-amber-400"
            />
            {errors.email ? <p id="email-error" className="text-xs text-[--color-danger]">{errors.email}</p> : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="font-mono text-xs uppercase tracking-widest text-slate-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={values.password}
              onChange={(e) => handleChange('password', e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-amber-400"
            />
            {errors.password ? <p id="password-error" className="text-xs text-[--color-danger]">{errors.password}</p> : null}
          </div>

          {submitError ? (
            <p className="rounded border border-[--color-danger]/40 bg-[--color-danger]/10 px-3 py-2 text-xs text-[--color-danger]">
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded border border-amber-400 bg-amber-400/10 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in...' : 'Enter Ops Console'}
          </button>
        </form>
      </section>
    </main>
  );
}
