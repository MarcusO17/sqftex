import Link from "next/link";
import type { Listing } from "@/lib/api/listings";

function formatPrice(listing: Listing): string {
  const ringgit = (listing.price_cents / 100).toFixed(2);
  const unit = listing.price_unit === "daily" ? "/day" : "/month";
  return `RM ${ringgit}${unit}`;
}

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/listings/${listing.id}`}>
      <h3>{listing.title}</h3>
      <p>{listing.address}</p>
      <p>
        {listing.size_sqft} sqft &middot; {formatPrice(listing)}
      </p>
    </Link>
  );
}
