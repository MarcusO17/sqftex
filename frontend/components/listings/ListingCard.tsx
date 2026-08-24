"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Ruler, Tag } from "lucide-react";
import type { Listing } from "@/lib/api/listings";
import { categoryLabel } from "@/lib/listingCategories";
import { formatPrice } from "@/lib/format";

const MotionLink = motion(Link);

// "Manifest Stamp" layout (size/price as a label-value spec row under a
// hairline rule) + "Loose Photo" treatment (the photo itself sits a hair
// off-square with its own shadow, rather than flush/bordered) — picked
// from components/listings' design exploration, minus the literal rubber-
// stamp badge for category (too gimmicky in practice — back to a plain
// eyebrow label) and minus the mouse-tracking 3D tilt + shine (replaced by
// a soft ambient glow on hover — calmer, and doesn't fight the photo's own
// static rotation, which is the one "wonky" move this card keeps).
//
// `id` matches what the map's pin-click focus (ListingBrowser) scrolls to
// and `focused` is the highlight that follows — see ListingBrowser.tsx.
// `onHoverChange` is the reverse direction: hovering a card reports back up
// so the map can pan to follow it.
export function ListingCard({
  listing,
  focused,
  onHoverChange,
}: {
  listing: Listing;
  focused?: boolean;
  onHoverChange?: (hovering: boolean) => void;
}) {
  const coverPhoto = listing.photos[0];
  const [hovered, setHovered] = useState(false);
  const glowVisible = hovered || focused;

  return (
    <div id={`listing-card-${listing.id}`} style={{ position: "relative", scrollMarginTop: 24 }}>
      {/* Ambient glow behind the card, replaces the old tilt+shine — a
          plain opacity fade is enough since it sits behind everything and
          just needs to read as "this card is active", not draw the eye. */}
      <motion.div
        aria-hidden
        initial={false}
        animate={{ opacity: glowVisible ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: "absolute",
          inset: -20,
          borderRadius: 28,
          background: "radial-gradient(60% 60% at 50% 45%, rgba(8,145,178,0.22), transparent 72%)",
          filter: "blur(18px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <MotionLink
        href={`/listings/${listing.id}`}
        onMouseEnter={() => {
          setHovered(true);
          onHoverChange?.(true);
        }}
        onMouseLeave={() => {
          setHovered(false);
          onHoverChange?.(false);
        }}
        initial={false}
        animate={{
          boxShadow: focused
            ? "0 0 0 2px var(--primary), 0 18px 34px rgba(14,13,16,0.14)"
            : hovered
              ? "0 0 0 0 transparent, 0 14px 30px rgba(14,13,16,0.10)"
              : "0 0 0 0 transparent, 0 0 0 0 transparent",
        }}
        transition={{ duration: 0.25 }}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 24,
          position: "relative",
          zIndex: 1,
          background: "var(--paper)",
          borderRadius: 16,
          padding: 12,
        }}
      >
        {/* The one wonky move: the photo sits a hair off-square, floating
            on its own shadow, while the rest of the card stays precise. It
            also pops slightly when this listing is the one focused from a
            map-pin click — a spring rather than a plain ease so it actually
            reads as a "pop", not just a resize. */}
        <motion.div
          initial={false}
          animate={{ scale: focused ? 1.06 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          style={{
            width: 232,
            minWidth: 232,
            height: 168,
            position: "relative",
            rotate: -2,
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
        </motion.div>

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

          {/* Manifest-style spec row: an icon + label-value pair per stat,
              under a hairline rule, instead of a plain "size · price" line. */}
          <div style={{ display: "flex", gap: 28, marginTop: 4, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Ruler size={15} strokeWidth={2} color="var(--primary)" style={{ flexShrink: 0 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))" }}>
                  Size
                </span>
                <strong style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15 }}>{listing.size_sqft} sqft</strong>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Tag size={15} strokeWidth={2} color="var(--primary)" style={{ flexShrink: 0 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))" }}>
                  Price
                </span>
                <strong style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15 }}>{formatPrice(listing)}</strong>
              </div>
            </div>
          </div>
        </div>
      </MotionLink>
    </div>
  );
}
