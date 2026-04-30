import { Navbar } from "@/components/Navbar";

export default function ShipperLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
