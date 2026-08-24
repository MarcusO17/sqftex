"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Listing } from "@/lib/api/listings";
import { categoryLabel } from "@/lib/listingCategories";
import { formatPrice } from "@/lib/format";
import { useTiltEffect, TiltGlare } from "@/components/ui/tilt";

const MotionLink = motion(Link);

// Horizontal row (photo left, full details right) — sized for a
// single-column list, not a multi-column grid; see ListingBrowser, which
// now stacks these instead of a card grid, to leave room for the map on
// the right of that page.
//
// `id` matches what the map's pin-click focus (ListingBrowser) scrolls to
// and `focused` is the highlight that follows — see ListingBrowser.tsx.
export function ListingCard({ listing, focused }: { listing: Listing; focused?: boolean }) {
  const coverPhoto = listing.photos[0];
  const tilt = useTiltEffect<HTMLAnchorElement>(6);

  return (
    // Wrapper supplies `perspective` so the card's own rotateX/rotateY read
    // as real 3D depth instead of a flat skew (perspective has to live on
    // an ancestor, not the rotated element itself).
    <div id={`listing-card-${listing.id}`} style={{ perspective: 1000, scrollMarginTop: 24 }}>
      <MotionLink
        ref={tilt.ref}
        href={`/listings/${listing.id}`}
        onMouseMove={tilt.onMouseMove}
        onMouseEnter={tilt.onMouseEnter}
        onMouseLeave={tilt.onMouseLeave}
        initial={false}
        animate={{
          boxShadow: focused ? "0 18px 34px rgba(14,13,16,0.16)" : "0 2px 10px rgba(14,13,16,0.06)",
        }}
        whileHover={{ boxShadow: "0 18px 34px rgba(14,13,16,0.16)" }}
        style={{
          display: "flex",
          flexDirection: "row",
          position: "relative",
          background: "var(--paper)",
          border: focused ? "1px solid var(--primary)" : "1px solid var(--line)",
          borderRadius: 14,
          overflow: "hidden",
          transformStyle: "preserve-3d",
          rotateX: tilt.rotateX,
          rotateY: tilt.rotateY,
        }}
      >
        <div
          style={{
            width: 260,
            minWidth: 260,
            alignSelf: "stretch",
            background: "var(--card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRight: "1px solid var(--line)",
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

        <div style={{ flex: 1, minWidth: 0, padding: 22, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <div className="label" style={{ color: "var(--primary)" }}>
                {categoryLabel(listing.category)}
              </div>
              <h3 style={{ fontSize: 19 }}>{listing.title}</h3>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>
                {formatPrice(listing)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
                {listing.size_sqft} sqft
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" style={{ flexShrink: 0 }}>
              <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" />
              <circle cx="12" cy="9" r="2.3" />
            </svg>
            {listing.address}
          </div>

          {listing.description && (
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--ink)",
                opacity: 0.75,
                marginTop: 2,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {listing.description}
            </p>
          )}
        </div>
        <TiltGlare handle={tilt} />
      </MotionLink>
    </div>
  );
}
