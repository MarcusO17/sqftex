"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Listing } from "@/lib/api/listings";
import { categoryLabel } from "@/lib/listingCategories";
import { formatPrice } from "@/lib/format";
import { useTiltEffect, TiltGlare } from "@/components/ui/tilt";

const MotionLink = motion(Link);

// "Manifest Stamp" layout (size/price as a label-value spec row under a
// hairline rule) + "Loose Photo" treatment (the photo itself sits a hair
// off-square with its own shadow, rather than flush/bordered) — picked
// from components/listings' design exploration, minus the literal rubber-
// stamp badge for category (turned out too gimmicky in practice) — that's
// back to a plain eyebrow label instead. One signature "wonky" move (the
// tilted photo) against an otherwise precise, borderless grid.
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
          boxShadow: focused
            ? "0 0 0 2px var(--primary), 0 18px 34px rgba(14,13,16,0.14)"
            : "0 0 0 0 transparent, 0 0 0 0 transparent",
        }}
        whileHover={{ boxShadow: "0 0 0 0 transparent, 0 14px 30px rgba(14,13,16,0.10)" }}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 24,
          position: "relative",
          background: "var(--paper)",
          borderRadius: 16,
          padding: 12,
          transformStyle: "preserve-3d",
          rotateX: tilt.rotateX,
          rotateY: tilt.rotateY,
        }}
      >
        {/* The one wonky move: a hair off-square, floating on its own
            shadow — rotation lives here, scoped to the photo, so it doesn't
            fight the whole row's mouse-tracking 3D tilt above. */}
        <div
          style={{
            width: 232,
            minWidth: 232,
            height: 168,
            position: "relative",
            transform: "rotate(-2deg)",
            borderRadius: 12,
            overflow: "hidden",
            background: "var(--card)",
            boxShadow: "0 10px 24px rgba(14,13,16,0.14)",
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
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--line)" strokeWidth="1.6">
                <rect x="3" y="9" width="18" height="12" rx="1" />
                <path d="M7 9V6a5 5 0 0110 0v3" />
              </svg>
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, padding: "10px 10px 10px 0", display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="label" style={{ color: "var(--primary)" }}>
            {categoryLabel(listing.category)}
          </div>
          <h3 style={{ fontSize: 19 }}>{listing.title}</h3>

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
                margin: 0,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {listing.description}
            </p>
          )}

          {/* Manifest-style spec row: label-value pairs under a hairline
              rule, instead of a plain "size · price" line. */}
          <div style={{ display: "flex", gap: 28, marginTop: 4, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))" }}>
                Size
              </span>
              <strong style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15 }}>{listing.size_sqft} sqft</strong>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))" }}>
                Price
              </span>
              <strong style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15 }}>{formatPrice(listing)}</strong>
            </div>
          </div>
        </div>
        <TiltGlare handle={tilt} />
      </MotionLink>
    </div>
  );
}
