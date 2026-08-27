import { apiFetch } from "./client";
import type { Listing } from "./listings";

export interface SavedListing {
  id: number;
  listing: Listing;
  created_at: string;
}

export async function listSavedListings(token: string): Promise<SavedListing[]> {
  return apiFetch<SavedListing[]>("/api/v1/saved-listings/", {}, token);
}

export async function saveListing(listingId: number, token: string): Promise<SavedListing> {
  return apiFetch<SavedListing>(
    "/api/v1/saved-listings/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId }),
    },
    token
  );
}

export async function unsaveListing(listingId: number, token: string): Promise<void> {
  return apiFetch<void>(`/api/v1/saved-listings/${listingId}/`, { method: "DELETE" }, token);
}
