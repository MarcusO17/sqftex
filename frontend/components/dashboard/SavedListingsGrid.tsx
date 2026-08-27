"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { unsaveListing, type SavedListing } from "@/lib/api/savedListings";
import { ListingCard } from "@/components/listings/ListingCard";

export function SavedListingsGrid({ savedListings: initial }: { savedListings: SavedListing[] }) {
  const { getToken } = useAuth();
  const [saved, setSaved] = useState(initial);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUnsave(listingId: number) {
    setError(null);
    setRemovingId(listingId);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in.");
      await unsaveListing(listingId, token);
      setSaved((prev) => prev.filter((s) => s.listing.id !== listingId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove that right now.");
    } finally {
      setRemovingId(null);
    }
  }

  if (saved.length === 0) {
    return (
      <p style={{ fontSize: 14, opacity: 0.65 }}>
        No saved listings yet. <Link href="/listings" className="nav-link">Browse listings</Link> and save
        ones you&apos;re considering.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {error && <p role="alert" style={{ fontSize: 13, color: "var(--secondary-dark)" }}>{error}</p>}
      {saved.map((item) => (
        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ListingCard listing={item.listing} />
          </div>
          <button
            type="button"
            className="btn-outline"
            style={{ padding: "8px 16px", fontSize: 13, whiteSpace: "nowrap" }}
            onClick={() => handleUnsave(item.listing.id)}
            disabled={removingId === item.listing.id}
          >
            {removingId === item.listing.id ? "Removing..." : "Remove"}
          </button>
        </div>
      ))}
    </div>
  );
}
