import { LandingStyles } from "@/components/landing/LandingStyles";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { QuickCategories } from "@/components/landing/QuickCategories";
import { ExploreMap } from "@/components/landing/ExploreMap";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { HostBand } from "@/components/landing/HostBand";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { listListings, type Listing } from "@/lib/api/listings";

// Listings change constantly and there's no live backend at build time in
// this environment — same reasoning as /listings (see that page).
export const dynamic = "force-dynamic";

// Public, unauthenticated fetch (no Clerk token) — the landing map is
// marketing surface, not the gated browse experience. Only live, verified
// listings with real coordinates are worth plotting; if the API is
// unreachable the map still renders, just with no pins.
async function getMapListings(): Promise<Listing[]> {
  try {
    const listings = await listListings();
    return listings.filter(
      (l) => l.status === "active" && Number.isFinite(l.location_lat) && Number.isFinite(l.location_lng)
    );
  } catch {
    return [];
  }
}

export default async function Home() {
  const mapListings = await getMapListings();

  return (
    <div
      style={{
        position: "relative",
        fontFamily: "var(--font-landing-body), system-ui, sans-serif",
        background: "var(--landing-paper)",
      }}
    >
      <LandingStyles />
      <LandingNav />
      <Hero />
      <QuickCategories />
      <ExploreMap listings={mapListings} />
      <HowItWorks />
      <TrustStrip />
      <HostBand />
      <LandingFooter />
    </div>
  );
}
