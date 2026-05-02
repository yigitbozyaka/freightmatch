import { FeatureGrid } from "./_components/landing/feature-grid";
import { LandingFooter } from "./_components/landing/footer";
import { Hero } from "./_components/landing/hero";
import { HowItWorks } from "./_components/landing/how-it-works";
import { OpsStrip } from "./_components/landing/ops-strip";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <Hero />
      <FeatureGrid />
      <OpsStrip />
      <HowItWorks />
      <LandingFooter />
    </main>
  );
}
