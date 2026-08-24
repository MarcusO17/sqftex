"use client";

import { useCallback, useMemo, useState } from "react";
import type { Listing } from "@/lib/api/listings";
import { LISTING_CATEGORIES } from "@/lib/listingCategories";
import { MapEmbed } from "@/components/map/MapEmbed";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ListingCard } from "./ListingCard";

const PAGE_SIZE = 10;

// Page numbers to render around the current page, with "…" for gaps —
// e.g. [1, "…", 4, 5, 6, "…", 12]. Shows every page when there aren't many.
function pageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push("ellipsis");
    result.push(p);
  });
  return result;
}

// Client-only: filtering runs over the listings the server already fetched,
// no extra API calls. See CLAUDE.md — filters are one of the cases that
// warrant a Client Component.
export function ListingBrowser({ listings }: { listings: Listing[] }) {
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  // Separate from focusedId: panToId only ever moves forward (see
  // PanToListing in LeafletMap.tsx) — hovering off a card shouldn't yank
  // the map back to wherever it was before, so it's not just "clear on
  // blur" the way focusedId's highlight is.
  const [panToId, setPanToId] = useState<number | null>(null);

  function changeCategory(next: string) {
    setCategory(next);
    setPage(1);
  }
  function changeQuery(next: string) {
    setQuery(next);
    setPage(1);
  }

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

  // Reverse direction: hovering a card in the list highlights it (same
  // pop+ring as a map-pin focus) and pans the map to follow it.
  const handleCardHoverChange = useCallback((id: number, hovering: boolean) => {
    if (hovering) {
      setFocusedId(id);
      setPanToId(id);
    } else {
      setFocusedId((prev) => (prev === id ? null : prev));
    }
  }, []);

  const filtered = useMemo(() => {
    return listings.filter((listing) => {
      const matchesCategory = category === "all" || listing.category === category;
      const matchesQuery =
        query.trim() === "" ||
        listing.title.toLowerCase().includes(query.toLowerCase()) ||
        (listing.address?.toLowerCase().includes(query.toLowerCase()) ?? false);
      return matchesCategory && matchesQuery;
    });
  }, [listings, category, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // The map mirrors only the current page's pins, not every filtered
  // result — keeps it in sync with what's actually visible in the list
  // (a pin for a listing on another page would have nothing to scroll to).
  const pageItems = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

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
          <button className="chip" data-active={category === "all"} onClick={() => changeCategory("all")}>
            All
          </button>
          {LISTING_CATEGORIES.map((c) => (
            <button
              key={c.value}
              className="chip"
              data-active={category === c.value}
              onClick={() => changeCategory(c.value)}
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
            onChange={(e) => changeQuery(e.target.value)}
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
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {pageItems.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    focused={listing.id === focusedId}
                    onHoverChange={(hovering) => handleCardHoverChange(listing.id, hovering)}
                  />
                ))}
              </div>

              {pageCount > 1 && (
                <Pagination style={{ marginTop: 32, justifyContent: "flex-start" }}>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (page > 1) setPage(page - 1);
                        }}
                        aria-disabled={page === 1}
                        style={page === 1 ? { pointerEvents: "none", opacity: 0.4 } : undefined}
                      />
                    </PaginationItem>
                    {pageNumbers(page, pageCount).map((p, i) =>
                      p === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${i}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            isActive={p === page}
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(p);
                            }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (page < pageCount) setPage(page + 1);
                        }}
                        aria-disabled={page === pageCount}
                        style={page === pageCount ? { pointerEvents: "none", opacity: 0.4 } : undefined}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </div>

        {/* Map on the right — sticky so it stays in view while the list
            scrolls, showing pins for exactly the current page (not the
            full filtered set) so it always matches what's actually visible
            on the left. Hidden below lg: a half-height map fighting a
            narrow list column for space isn't worth it on small screens. */}
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
          <MapEmbed listings={pageItems} onPinFocus={handlePinFocus} onPinBlur={handlePinBlur} panToId={panToId} />
        </div>
      </div>
    </div>
  );
}
