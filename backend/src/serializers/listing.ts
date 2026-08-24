import type { Listing, ListingPhoto } from "@prisma/client";

export interface ListingPhotoJSON {
  id: number;
  image: string;
  order: number;
}

export interface ListingJSON {
  id: number;
  owner: number;
  title: string;
  description: string;
  category: string;
  size_sqft: number;
  price_cents: number | null;
  price_unit: string | null;
  address: string | null;
  access_rules: string;
  prohibited_items: string;
  status: string;
  photos: ListingPhotoJSON[];
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  updated_at: string;
}

type ListingWithPhotos = Listing & { photos: ListingPhoto[] };

export function toListingPhotoJSON(photo: ListingPhoto): ListingPhotoJSON {
  return { id: photo.id, image: photo.imageUrl, order: photo.order };
}

export function toListingJSON(listing: ListingWithPhotos): ListingJSON {
  return {
    id: listing.id,
    owner: listing.ownerId,
    title: listing.title,
    description: listing.description,
    category: listing.category,
    size_sqft: listing.sizeSqft,
    price_cents: listing.priceCents,
    price_unit: listing.priceUnit,
    address: listing.address,
    access_rules: listing.accessRules,
    prohibited_items: listing.prohibitedItems,
    status: listing.status,
    photos: listing.photos.map(toListingPhotoJSON),
    location_lat: listing.lat,
    location_lng: listing.lng,
    created_at: listing.createdAt.toISOString(),
    updated_at: listing.updatedAt.toISOString(),
  };
}
