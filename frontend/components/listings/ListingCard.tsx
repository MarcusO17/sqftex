import Link from "next/link";
import type { Listing } from "@/lib/api/listings";
import { categoryLabel } from "@/lib/listingCategories";

function formatPrice(listing: Listing): string {
  const ringgit = (listing.price_cents / 100).toFixed(2);
  const unit = listing.price_unit === "daily" ? "/day" : "/month";
  return `RM ${ringgit}${unit}`;
}

export function ListingCard({ listing }: { listing: Listing }) {
  const coverPhoto = listing.photos[0];

  return (
    <Link
      href={`/listings/${listing.id}`}
      style={{
        display: "block",
        background: "var(--paper)",
        border: "3px solid var(--ink)",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 160,
          background: "var(--card)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "3px solid var(--ink)",
        }}
      >
        {coverPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverPhoto.image}
            alt={listing.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="var(--line)" strokeWidth="1.6">
            <rect x="3" y="9" width="18" height="12" rx="1" />
            <path d="M7 9V6a5 5 0 0110 0v3" />
          </svg>
        )}
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="label" style={{ color: "var(--primary)" }}>
          {categoryLabel(listing.category)}
        </div>
        <h3 style={{ fontSize: 17 }}>{listing.title}</h3>
        <p style={{ fontSize: 14, fontWeight: 500 }}>{listing.address}</p>
        <p style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>
          {listing.size_sqft} sqft &middot; {formatPrice(listing)}
        </p>
      </div>
    </Link>
  );
}
