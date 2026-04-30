import { Navbar } from "@/components/Navbar";

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
