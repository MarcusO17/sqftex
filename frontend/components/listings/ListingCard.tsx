"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Listing } from "@/lib/api/listings";
import { categoryLabel } from "@/lib/listingCategories";
import { useTiltEffect, TiltGlare } from "@/components/ui/tilt";

const MotionLink = motion(Link);

function formatPrice(listing: Listing): string {
  const ringgit = (listing.price_cents / 100).toFixed(2);
  const unit = listing.price_unit === "daily" ? "/day" : "/month";
  return `RM ${ringgit}${unit}`;
}

export function ListingCard({ listing }: { listing: Listing }) {
  const coverPhoto = listing.photos[0];
  const tilt = useTiltEffect<HTMLAnchorElement>(6);

  return (
    // Wrapper supplies `perspective` so the card's own rotateX/rotateY read
    // as real 3D depth instead of a flat skew (perspective has to live on
    // an ancestor, not the rotated element itself).
    <div style={{ perspective: 1000 }}>
      <MotionLink
        ref={tilt.ref}
        href={`/listings/${listing.id}`}
        onMouseMove={tilt.onMouseMove}
        onMouseEnter={tilt.onMouseEnter}
        onMouseLeave={tilt.onMouseLeave}
        initial={{ boxShadow: "0 2px 10px rgba(14,13,16,0.06)" }}
        whileHover={{ boxShadow: "0 18px 34px rgba(14,13,16,0.16)" }}
        style={{
          display: "block",
          position: "relative",
          background: "var(--paper)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          overflow: "hidden",
          transformStyle: "preserve-3d",
          rotateX: tilt.rotateX,
          rotateY: tilt.rotateY,
        }}
      >
        <div
          style={{
            height: 160,
            background: "var(--card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid var(--line)",
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
        <TiltGlare handle={tilt} />
      </MotionLink>
    </div>
  );
}
