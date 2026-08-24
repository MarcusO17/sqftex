import type { Listing } from "@/lib/api/listings";

// Shared by ListingCard and the map's pin popup so the price reads
// identically wherever a listing is previewed.
export function formatPrice(listing: Pick<Listing, "price_cents" | "price_unit">): string {
  const ringgit = (listing.price_cents / 100).toFixed(2);
  const unit = listing.price_unit === "daily" ? "/day" : "/month";
  return `RM ${ringgit}${unit}`;
}
