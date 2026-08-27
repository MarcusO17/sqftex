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

const listingFields = {
  title: "Spare Room",
  description: "Nice and dry.",
  category: "spare_room" as const,
  sizeSqft: 120,
  priceCents: 15000,
  priceUnit: "monthly" as const,
  address: "PJ Old Town",
  lat: 3.1073,
  lng: 101.6415,
  status: "active" as const,
};

describe("saved listings routes", () => {
  afterEach(async () => {
    await prisma.savedListing.deleteMany({ where: { user: { clerkUserId: { startsWith: "test_saved_" } } } });
    await prisma.listing.deleteMany({ where: { owner: { clerkUserId: { startsWith: "test_saved_" } } } });
    await prisma.user.deleteMany({ where: { clerkUserId: { startsWith: "test_saved_" } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("POST / saves a listing for the caller", async () => {
    const host = await makeUser("test_saved_host1", "host1@example.com", true);
    const listing = await prisma.listing.create({ data: { ...listingFields, ownerId: host.id } });
    await makeUser("test_saved_renter1", "renter1@example.com", true);
    authAs("test_saved_renter1", "renter1@example.com");

    const res = await request(await createApp()).post("/api/v1/saved-listings/").send({ listing_id: listing.id });
    expect(res.status).toBe(201);
    expect(res.body.listing.id).toBe(listing.id);
  });

  it("POST / is idempotent — saving twice doesn't error", async () => {
    const host = await makeUser("test_saved_host2", "host2@example.com", true);
    const listing = await prisma.listing.create({ data: { ...listingFields, ownerId: host.id } });
    await makeUser("test_saved_renter2", "renter2@example.com", true);
    authAs("test_saved_renter2", "renter2@example.com");

    const app = await createApp();
    const first = await request(app).post("/api/v1/saved-listings/").send({ listing_id: listing.id });
    const second = await request(app).post("/api/v1/saved-listings/").send({ listing_id: listing.id });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const rows = await prisma.savedListing.findMany({ where: { listingId: listing.id } });
    expect(rows).toHaveLength(1);
  });

  it("GET / returns only the caller's own saved listings", async () => {
    const host = await makeUser("test_saved_host3", "host3@example.com", true);
    const listing = await prisma.listing.create({ data: { ...listingFields, ownerId: host.id } });
    const renter = await makeUser("test_saved_renter3", "renter3@example.com", true);
    const other = await makeUser("test_saved_renter4", "renter4@example.com", true);
    await prisma.savedListing.create({ data: { userId: renter.id, listingId: listing.id } });
    await prisma.savedListing.create({ data: { userId: other.id, listingId: listing.id } });

    authAs("test_saved_renter3", "renter3@example.com");
    const res = await request(await createApp()).get("/api/v1/saved-listings/");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("GET / requires auth", async () => {
    anon();
    const res = await request(await createApp()).get("/api/v1/saved-listings/");
    expect(res.status).toBe(401);
  });

  it("DELETE /:listingId/ unsaves, and is idempotent if not saved", async () => {
    const host = await makeUser("test_saved_host4", "host4@example.com", true);
    const listing = await prisma.listing.create({ data: { ...listingFields, ownerId: host.id } });
    const renter = await makeUser("test_saved_renter5", "renter5@example.com", true);
    await prisma.savedListing.create({ data: { userId: renter.id, listingId: listing.id } });

    authAs("test_saved_renter5", "renter5@example.com");
    const app = await createApp();
    const first = await request(app).delete(`/api/v1/saved-listings/${listing.id}/`);
    const second = await request(app).delete(`/api/v1/saved-listings/${listing.id}/`);
    expect(first.status).toBe(204);
    expect(second.status).toBe(204);

    const rows = await prisma.savedListing.findMany({ where: { listingId: listing.id } });
    expect(rows).toHaveLength(0);
  });
});
