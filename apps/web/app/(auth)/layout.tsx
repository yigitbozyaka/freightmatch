import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

  return <>{children}</>;
}
