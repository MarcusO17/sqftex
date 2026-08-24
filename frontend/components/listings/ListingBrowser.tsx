"use client";

import { useMemo, useState } from "react";
import type { Listing } from "@/lib/api/listings";
import { LISTING_CATEGORIES } from "@/lib/listingCategories";
import { ListingCard } from "./ListingCard";

// Client-only: filtering runs over the listings the server already fetched,
// no extra API calls. See CLAUDE.md — filters are one of the cases that
// warrant a Client Component.
export function ListingBrowser({ listings }: { listings: Listing[] }) {
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

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

      <div style={{ padding: "40px 64px" }}>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
          {filtered.length} {filtered.length === 1 ? "SPACE" : "SPACES"} AVAILABLE
        </p>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 15 }}>No listings match your filters.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 24 }}>
            {filtered.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
