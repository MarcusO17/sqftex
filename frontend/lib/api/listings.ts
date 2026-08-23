import { apiFetch } from "./client";

export interface ListingPhoto {
  id: number;
  image: string;
  order: number;
}

export interface Listing {
  id: number;
  owner: number;
  title: string;
  description: string;
  category: string;
  size_sqft: number;
  price_cents: number;
  price_unit: "daily" | "monthly";
  address: string;
  access_rules: string;
  prohibited_items: string;
  status: "draft" | "active";
  photos: ListingPhoto[];
  location_lat: number;
  location_lng: number;
  created_at: string;
  updated_at: string;
}

export interface CreateListingInput {
  title: string;
  description: string;
  category: string;
  size_sqft: number;
  price_cents: number;
  price_unit: "daily" | "monthly";
  address: string;
  access_rules: string;
  prohibited_items: string;
  latitude: number;
  longitude: number;
}

export async function listListings(): Promise<Listing[]> {
  return apiFetch<Listing[]>("/api/v1/listings/");
}

export async function getListing(id: number): Promise<Listing> {
  return apiFetch<Listing>(`/api/v1/listings/${id}/`);
}

export async function createListing(input: CreateListingInput): Promise<Listing> {
  return apiFetch<Listing>("/api/v1/listings/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function addListingPhoto(listingId: number, file: File): Promise<ListingPhoto> {
  const formData = new FormData();
  formData.append("image", file);
  return apiFetch<ListingPhoto>(`/api/v1/listings/${listingId}/photos/`, {
    method: "POST",
    body: formData,
  });
}

export async function publishListing(listingId: number): Promise<Listing> {
  return apiFetch<Listing>(`/api/v1/listings/${listingId}/publish/`, {
    method: "POST",
  });
}
