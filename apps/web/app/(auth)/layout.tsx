import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GridBackdrop } from "@/components/GridBackdrop";

function decodeRole(token: string): string | null {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const data = JSON.parse(Buffer.from(payload, "base64").toString("utf-8")) as {
      role?: string;
    };
    return data.role ?? null;
  } catch {
    return null;
  }
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("fm_access")?.value;

  if (accessToken) {
    const role = decodeRole(accessToken);
    if (role === "Shipper") redirect("/shipper/dashboard");
    if (role === "Carrier") redirect("/carrier/dashboard");
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <GridBackdrop />
      <div 
        aria-hidden="true" 
        className="pointer-events-none fixed inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      <main className="z-10 w-full max-w-md fm-panel-surface rounded-xl p-8 shadow-2xl relative overflow-hidden">
        {/* Adds a slight inner top glow */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
        {children}
      </main>
    </div>
  );
}
