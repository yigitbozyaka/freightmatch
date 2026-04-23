'use client';

import { type FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { GridBackdrop } from '@/components/GridBackdrop';
import { useAuth } from '@/lib/hooks/useAuth';
import { login, register } from '@/lib/api/users';

const RegisterSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['Shipper', 'Carrier']),
});

type RegisterValues = z.infer<typeof RegisterSchema>;

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { label: 'Weak', color: 'bg-[--color-danger]', width: 'w-1/4' };
  if (score <= 2) return { label: 'Fair', color: 'bg-amber-500', width: 'w-2/4' };
  if (score <= 3) return { label: 'Good', color: 'bg-[--color-transit]', width: 'w-3/4' };
  return { label: 'Strong', color: 'bg-[--color-go]', width: 'w-full' };
}

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [values, setValues] = useState<RegisterValues>({ email: '', password: '', role: 'Shipper' });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterValues, string>>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const strength = useMemo(() => getPasswordStrength(values.password), [values.password]);

  const handleChange = (field: keyof RegisterValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value as RegisterValues[typeof field] }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = RegisterSchema.safeParse(values);

    if (!parsed.success) {
      const formErrors: Partial<Record<keyof RegisterValues, string>> = {};
      const flattened = parsed.error.flatten().fieldErrors;
      if (flattened.email?.[0]) formErrors.email = flattened.email[0];
      if (flattened.password?.[0]) formErrors.password = flattened.password[0];
      if (flattened.role?.[0]) formErrors.role = flattened.role[0];
      setErrors(formErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await register(parsed.data);
      const loginResult = await login({ email: parsed.data.email, password: parsed.data.password });
      setUser(loginResult.user);
      router.push(loginResult.user.role === 'Carrier' ? '/carrier/dashboard' : '/shipper/dashboard');
    } catch {
      setSubmitError('Registration failed. Please check your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6 py-10">
      <GridBackdrop />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,179,66,0.08),transparent_55%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_0.5px,transparent_0.5px)] [background-size:3px_3px]" />

      <section className="relative z-10 w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-950/90 p-7 shadow-[0_0_80px_rgba(0,0,0,0.45)]">
        <p className="font-mono text-xs tracking-[0.2em] text-amber-400 uppercase">FreightMatch</p>
        <h1 className="mt-2 text-3xl font-black text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>
          FREIGHTMATCH // OPS
        </h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-wider text-slate-400">Create operator account</p>

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
              aria-describedby={errors.email ? 'register-email-error' : undefined}
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-amber-400"
            />
            {errors.email ? <p id="register-email-error" className="text-xs text-[--color-danger]">{errors.email}</p> : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="font-mono text-xs uppercase tracking-widest text-slate-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={(e) => handleChange('password', e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'register-password-error password-strength' : 'password-strength'}
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-amber-400"
            />
            {errors.password ? <p id="register-password-error" className="text-xs text-[--color-danger]">{errors.password}</p> : null}
            <div id="password-strength" className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded bg-slate-800">
                <div className={`h-full ${strength.width} ${strength.color} transition-all`} />
              </div>
              <p className="font-mono text-[11px] text-slate-400">Strength: {strength.label}</p>
            </div>
          </div>

          <fieldset className="space-y-2" aria-describedby={errors.role ? 'register-role-error' : undefined}>
            <legend className="font-mono text-xs uppercase tracking-widest text-slate-300">Role</legend>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => handleChange('role', 'Shipper')}
                className={`rounded border p-4 text-left transition ${values.role === 'Shipper' ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 bg-slate-900 hover:border-slate-500'}`}
              >
                <p className="font-mono text-sm text-slate-100">🏭 Shipper</p>
                <p className="mt-1 text-xs text-slate-400">Post loads fast and track bids in one console.</p>
              </button>
              <button
                type="button"
                onClick={() => handleChange('role', 'Carrier')}
                className={`rounded border p-4 text-left transition ${values.role === 'Carrier' ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 bg-slate-900 hover:border-slate-500'}`}
              >
                <p className="font-mono text-sm text-slate-100">🚚 Carrier</p>
                <p className="mt-1 text-xs text-slate-400">Discover freight opportunities and bid with speed.</p>
              </button>
            </div>
            {errors.role ? <p id="register-role-error" className="text-xs text-[--color-danger]">{errors.role}</p> : null}
          </fieldset>

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
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
      </section>
    </main>
  );
}
