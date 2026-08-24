jest.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: jest.fn(),
  clerkClient: { users: { getUser: jest.fn() } },
}));

import request from "supertest";
import { clerkClient, getAuth } from "@clerk/express";
import { createApp } from "../../src/app";
import { prisma } from "../../src/prisma";

async function makeUser(clerkUserId: string, email: string, isVerified: boolean) {
  return prisma.user.create({ data: { clerkUserId, email, isVerified } });
}

function authAs(clerkUserId: string, email: string) {
  (getAuth as jest.Mock).mockReturnValue({ userId: clerkUserId });
  (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
    emailAddresses: [{ emailAddress: email }],
  });
}

function anon() {
  (getAuth as jest.Mock).mockReturnValue({ userId: null });
}

// `validInput` mirrors the API's snake_case JSON body shape (what routes
// accept). Prisma's direct client calls below need its camelCase model
// field names instead — spreading `validInput` straight into
// `prisma.listing.create()` sends unknown keys like `size_sqft` and fails.
// This holds just the fields not otherwise overridden at each call site.
const dbFields = {
  title: "Spare Room",
  description: "Nice and dry.",
  address: "PJ Old Town",
};

const validInput = {
  title: "Spare Room",
  description: "Nice and dry.",
  category: "spare_room",
  size_sqft: 120,
  price_cents: 15000,
  price_unit: "monthly",
  address: "PJ Old Town",
  access_rules: "",
  prohibited_items: "",
  latitude: 3.1073,
  longitude: 101.6415,
};

describe("listings routes", () => {
  afterEach(async () => {
    await prisma.listing.deleteMany({ where: { owner: { clerkUserId: { startsWith: "test_listings_" } } } });
    await prisma.user.deleteMany({ where: { clerkUserId: { startsWith: "test_listings_" } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("POST / rejects an unverified user with 400", async () => {
    await makeUser("test_listings_unverified", "unverified@example.com", false);
    authAs("test_listings_unverified", "unverified@example.com");

    const res = await request(await createApp()).post("/api/v1/listings/").send(validInput);
    expect(res.status).toBe(400);
  });

  it("POST / creates a listing for a verified user", async () => {
    await makeUser("test_listings_owner", "owner@example.com", true);
    authAs("test_listings_owner", "owner@example.com");

    const res = await request(await createApp()).post("/api/v1/listings/").send(validInput);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "Spare Room",
      category: "spare_room",
      status: "draft",
      location_lat: 3.1073,
      location_lng: 101.6415,
    });
  });

  it("GET / returns only active listings for an anonymous caller", async () => {
    const owner = await makeUser("test_listings_owner2", "owner2@example.com", true);
    await prisma.listing.create({
      data: { ...dbFields, sizeSqft: 120, priceCents: 15000, priceUnit: "monthly", category: "spare_room", status: "active", lat: 1, lng: 1, ownerId: owner.id, title: "Active One" },
    });
    await prisma.listing.create({
      data: { ...dbFields, sizeSqft: 120, priceCents: 15000, priceUnit: "monthly", category: "spare_room", status: "draft", lat: 1, lng: 1, ownerId: owner.id, title: "Draft One" },
    });

    anon();
    const res = await request(await createApp()).get("/api/v1/listings/");
    expect(res.status).toBe(200);
    const titles = res.body.map((l: any) => l.title);
    expect(titles).toContain("Active One");
    expect(titles).not.toContain("Draft One");
  });

  it("PATCH /:id/ lets the owner update their own listing, 404s for a non-owner", async () => {
    const owner = await makeUser("test_listings_owner3", "owner3@example.com", true);
    const other = await makeUser("test_listings_other", "other@example.com", true);
    const listing = await prisma.listing.create({
      data: { ...dbFields, sizeSqft: 120, priceCents: 15000, priceUnit: "monthly", category: "spare_room", status: "draft", lat: 1, lng: 1, ownerId: owner.id },
    });

    authAs("test_listings_owner3", "owner3@example.com");
    const okRes = await request(await createApp())
      .patch(`/api/v1/listings/${listing.id}/`)
      .send({ title: "Updated Title" });
    expect(okRes.status).toBe(200);
    expect(okRes.body.title).toBe("Updated Title");

    authAs("test_listings_other", "other@example.com");
    const forbiddenRes = await request(await createApp())
      .patch(`/api/v1/listings/${listing.id}/`)
      .send({ title: "Hijacked" });
    expect(forbiddenRes.status).toBe(404);
  });

  it("DELETE /:id/ removes the listing for its owner", async () => {
    const owner = await makeUser("test_listings_owner4", "owner4@example.com", true);
    const listing = await prisma.listing.create({
      data: { ...dbFields, sizeSqft: 120, priceCents: 15000, priceUnit: "monthly", category: "spare_room", status: "draft", lat: 1, lng: 1, ownerId: owner.id },
    });

    authAs("test_listings_owner4", "owner4@example.com");
    const res = await request(await createApp()).delete(`/api/v1/listings/${listing.id}/`);
    expect(res.status).toBe(204);

    const gone = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(gone).toBeNull();
  });
});
