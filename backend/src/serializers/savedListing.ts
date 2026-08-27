import type { Listing, ListingPhoto, SavedListing } from "@prisma/client";
import { toListingJSON } from "./listing";

export interface SavedListingJSON {
  id: number;
  listing: ReturnType<typeof toListingJSON>;
  created_at: string;
}

type SavedListingWithListing = SavedListing & { listing: Listing & { photos: ListingPhoto[] } };

export function toSavedListingJSON(saved: SavedListingWithListing): SavedListingJSON {
  return {
    id: saved.id,
    listing: toListingJSON(saved.listing),
    created_at: saved.createdAt.toISOString(),
  };
}
