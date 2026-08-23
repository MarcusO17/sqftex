import { listListings } from "@/lib/api/listings";
import { NavBar } from "@/components/layout/NavBar";
import { ListingBrowser } from "@/components/listings/ListingBrowser";

// Listings change constantly and there's no live backend at build time in
// this environment (no static export config) — render this route per-request
// instead of letting Next attempt to prerender it statically at build time.
export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const listings = await listListings();

  return (
    <div>
      <NavBar variant="app" />
      {listings.length === 0 ? (
        <div style={{ padding: "40px 64px" }}>
          <p style={{ fontSize: 15 }}>No listings yet.</p>
        </div>
      ) : (
        <ListingBrowser listings={listings} />
      )}
    </div>
  );
}
