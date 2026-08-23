import { listListings } from "@/lib/api/listings";
import { ListingCard } from "@/components/listings/ListingCard";

// Listings change constantly and there's no live backend at build time in
// this environment (no static export config) — render this route per-request
// instead of letting Next attempt to prerender it statically at build time.
export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const listings = await listListings();

  return (
    <main>
      <h1>Available space</h1>
      {listings.length === 0 ? (
        <p>No listings yet.</p>
      ) : (
        <div>
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </main>
  );
}
