"use client";

import { useCallback, useMemo, useState } from "react";
import type { Listing } from "@/lib/api/listings";
import { LISTING_CATEGORIES } from "@/lib/listingCategories";
import { MapEmbed } from "@/components/map/MapEmbed";
import { ListingCard } from "./ListingCard";

// Client-only: filtering runs over the listings the server already fetched,
// no extra API calls. See CLAUDE.md — filters are one of the cases that
// warrant a Client Component.
export function ListingBrowser({ listings }: { listings: Listing[] }) {
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [focusedId, setFocusedId] = useState<number | null>(null);

  // Clicking a map pin opens its preview popup (see LeafletMap) rather than
  // navigating straight away — this is what that popup reports back:
  // highlight + scroll to the matching card in the list on the left, so the
  // pin click stays cheap to back out of instead of committing to a full
  // page navigation immediately.
  const handlePinFocus = useCallback((id: number) => {
    setFocusedId(id);
    document.getElementById(`listing-card-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);
  const handlePinBlur = useCallback(() => setFocusedId(null), []);

  const filtered = useMemo(() => {
    return listings.filter((listing) => {
      const matchesCategory = category === "all" || listing.category === category;
      const matchesQuery =
        query.trim() === "" ||
        listing.title.toLowerCase().includes(query.toLowerCase()) ||
        listing.address.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [listings, category, query]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
          padding: "24px 64px",
          borderBottom: "1px solid var(--line)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="chip" data-active={category === "all"} onClick={() => setCategory("all")}>
            All
          </button>
          {LISTING_CATEGORIES.map((c) => (
            <button
              key={c.value}
              className="chip"
              data-active={category === c.value}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="2"
            style={{ position: "absolute", left: 13 }}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or area"
            style={{
              fontSize: 14,
              padding: "11px 14px 11px 40px",
              border: "1px solid var(--line)",
              borderRadius: 10,
              width: 260,
              outline: "none",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 32, padding: "40px 64px" }}>
        {/* Listings on the left, scrolling with the page. */}
        <div style={{ flex: "1.4 1 0", minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
            {filtered.length} {filtered.length === 1 ? "SPACE" : "SPACES"} AVAILABLE
          </p>
          {filtered.length === 0 ? (
            <p style={{ fontSize: 15 }}>No listings match your filters.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {filtered.map((listing) => (
                <ListingCard key={listing.id} listing={listing} focused={listing.id === focusedId} />
              ))}
            </div>
          )}
        </div>

        {/* Map on the right — sticky so it stays in view while the list
            scrolls, reactive to the current category/search filters (not
            just the full listing set) so it always matches what's on the
            left. Hidden below lg: a half-height map fighting a narrow list
            column for space isn't worth it on small screens. */}
        <div
          className="hidden lg:block"
          style={{
            flex: "1 1 0",
            position: "sticky",
            top: 24,
            height: "calc(100vh - 64px)",
            minHeight: 420,
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid var(--line)",
            boxShadow: "0 2px 10px rgba(14,13,16,0.06)",
            // Leaflet's internal panes use z-index values up to 700 — an
            // explicit stacking context here keeps them from painting over
            // the fixed/sticky nav above (see the same note in ExploreMap.tsx).
            zIndex: 1,
          }}
        >
          <MapEmbed listings={filtered} onPinFocus={handlePinFocus} onPinBlur={handlePinBlur} />
        </div>
      </div>
    </div>
  );
}
