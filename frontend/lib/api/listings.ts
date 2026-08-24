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
  price_cents: number | null;
  price_unit: "daily" | "monthly" | null;
  address: string | null;
  access_rules: string;
  prohibited_items: string;
  status: "draft" | "active";
  photos: ListingPhoto[];
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateListingInput {
  title: string;
  description: string;
  category: string;
  size_sqft: number;
  price_cents?: number;
  price_unit?: "daily" | "monthly";
  address?: string;
  access_rules?: string;
  prohibited_items?: string;
  latitude?: number;
  longitude?: number;
}

export async function listListings(token?: string | null): Promise<Listing[]> {
  return apiFetch<Listing[]>("/api/v1/listings/", {}, token);
}

export async function listMyDraftListings(token: string): Promise<Listing[]> {
  return apiFetch<Listing[]>("/api/v1/listings/?mine=1&status=draft", {}, token);
}

export async function getListing(id: number, token?: string | null): Promise<Listing> {
  return apiFetch<Listing>(`/api/v1/listings/${id}/`, {}, token);
}

export async function createListing(input: CreateListingInput, token: string): Promise<Listing> {
  return apiFetch<Listing>(
    "/api/v1/listings/",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
    token
  );
}

export async function updateListing(
  id: number,
  input: Partial<CreateListingInput>,
  token: string
): Promise<Listing> {
  return apiFetch<Listing>(
    `/api/v1/listings/${id}/`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
    token
  );
}

export async function addListingPhoto(listingId: number, file: File, token: string): Promise<ListingPhoto> {
  const formData = new FormData();
  formData.append("image", file);
  return apiFetch<ListingPhoto>(
    `/api/v1/listings/${listingId}/photos/`,
    { method: "POST", body: formData },
    token
  );
}

export async function publishListing(listingId: number, token: string): Promise<Listing> {
  return apiFetch<Listing>(`/api/v1/listings/${listingId}/publish/`, { method: "POST" }, token);
}
