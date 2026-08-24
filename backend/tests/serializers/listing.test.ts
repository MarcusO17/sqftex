import type { Listing, ListingPhoto } from "@prisma/client";
import { toListingJSON, toListingPhotoJSON } from "../../src/serializers/listing";

const baseListing: Listing = {
  id: 5,
  ownerId: 2,
  title: "Spare Room",
  description: "Nice and dry.",
  category: "spare_room",
  sizeSqft: 120,
  priceCents: 15000,
  priceUnit: "monthly",
  lat: 3.1073,
  lng: 101.6415,
  address: "PJ Old Town",
  accessRules: "Call ahead.",
  prohibitedItems: "",
  status: "active",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

describe("toListingPhotoJSON", () => {
  it("maps imageUrl to image", () => {
    const photo: ListingPhoto = { id: 1, listingId: 5, imageUrl: "https://x/y.jpg", order: 0 };
    expect(toListingPhotoJSON(photo)).toEqual({ id: 1, image: "https://x/y.jpg", order: 0 });
  });
});

describe("toListingJSON", () => {
  it("maps camelCase Prisma fields to the API's snake_case shape, values unchanged", () => {
    const json = toListingJSON({ ...baseListing, photos: [] });
    expect(json).toEqual({
      id: 5,
      owner: 2,
      title: "Spare Room",
      description: "Nice and dry.",
      category: "spare_room",
      size_sqft: 120,
      price_cents: 15000,
      price_unit: "monthly",
      address: "PJ Old Town",
      access_rules: "Call ahead.",
      prohibited_items: "",
      status: "active",
      photos: [],
      location_lat: 3.1073,
      location_lng: 101.6415,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    });
  });
});

describe("toListingJSON with a draft (unset) listing", () => {
  it("passes through nulls for fields the wizard hasn't collected yet", () => {
    const draft: Listing = {
      ...baseListing,
      priceCents: null,
      priceUnit: null,
      lat: null,
      lng: null,
      address: null,
      status: "draft",
    };
    const json = toListingJSON({ ...draft, photos: [] });
    expect(json.price_cents).toBeNull();
    expect(json.price_unit).toBeNull();
    expect(json.location_lat).toBeNull();
    expect(json.location_lng).toBeNull();
    expect(json.address).toBeNull();
  });
});
