import type { Metadata } from "next";
import { GridBackdrop } from "@/components/GridBackdrop";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "FreightMatch — Industrial Ops Console",
  description: "Connect shippers and carriers with AI-powered freight matching",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <GridBackdrop />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
