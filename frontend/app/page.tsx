import { Unbounded, Manrope } from "next/font/google";
import { LandingStyles } from "@/components/landing/LandingStyles";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { QuickCategories } from "@/components/landing/QuickCategories";
import { ExploreMap } from "@/components/landing/ExploreMap";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { landingColors as c } from "@/components/landing/tokens";

const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-landing-heading",
  weight: ["600", "700", "800"],
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-landing-body",
  weight: ["400", "500", "600", "700", "800"],
});

export default function Home() {
  return (
    <div
      className={`${unbounded.variable} ${manrope.variable}`}
      style={{
        position: "relative",
        fontFamily: "var(--font-landing-body), system-ui, sans-serif",
        background: c.paper,
      }}
    >
      <LandingStyles />
      <LandingNav />
      <Hero />
      <QuickCategories />
      <ExploreMap />
      <HowItWorks />
    </div>
  );
}
