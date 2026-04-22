import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs tracking-widest text-[--color-danger] uppercase">
        Access Denied
      </p>
      <h1
        className="mt-2 text-5xl font-bold text-slate-100 tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        403
      </h1>
      <p className="mt-3 text-sm text-slate-400 max-w-xs">
        Your role does not have permission to access this page.
      </p>
      <Link
        href="/"
        className="mt-8 font-mono text-xs text-amber-400 hover:text-amber-300 underline underline-offset-4"
      >
        ← Return home
      </Link>
    </main>
  );
}
