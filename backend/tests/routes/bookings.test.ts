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

const activeListingFields = {
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

describe("bookings routes", () => {
  afterEach(async () => {
    await prisma.booking.deleteMany({ where: { renter: { clerkUserId: { startsWith: "test_bookings_" } } } });
    await prisma.listing.deleteMany({ where: { owner: { clerkUserId: { startsWith: "test_bookings_" } } } });
    await prisma.user.deleteMany({ where: { clerkUserId: { startsWith: "test_bookings_" } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("POST / rejects an unverified renter with 400", async () => {
    const host = await makeUser("test_bookings_host1", "host1@example.com", true);
    const listing = await prisma.listing.create({ data: { ...activeListingFields, ownerId: host.id } });
    await makeUser("test_bookings_unverified", "unverified@example.com", false);
    authAs("test_bookings_unverified", "unverified@example.com");

    const res = await request(await createApp())
      .post("/api/v1/bookings/")
      .send({ listing_id: listing.id, start_date: "2026-09-01" });
    expect(res.status).toBe(400);
  });

  it("POST / creates a pending booking, freezing the listing's price", async () => {
    const host = await makeUser("test_bookings_host2", "host2@example.com", true);
    const listing = await prisma.listing.create({ data: { ...activeListingFields, ownerId: host.id } });
    await makeUser("test_bookings_renter1", "renter1@example.com", true);
    authAs("test_bookings_renter1", "renter1@example.com");

    const res = await request(await createApp())
      .post("/api/v1/bookings/")
      .send({ listing_id: listing.id, start_date: "2026-09-01" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: "pending",
      amount_cents: 15000,
      commission_cents: null,
    });
  });

  it("POST / rejects booking a listing that isn't active", async () => {
    const host = await makeUser("test_bookings_host3", "host3@example.com", true);
    const listing = await prisma.listing.create({
      data: { ...activeListingFields, ownerId: host.id, status: "draft" },
    });
    await makeUser("test_bookings_renter2", "renter2@example.com", true);
    authAs("test_bookings_renter2", "renter2@example.com");

    const res = await request(await createApp())
      .post("/api/v1/bookings/")
      .send({ listing_id: listing.id, start_date: "2026-09-01" });
    expect(res.status).toBe(404);
  });

  it("POST / rejects a host booking their own listing", async () => {
    const host = await makeUser("test_bookings_host4", "host4@example.com", true);
    const listing = await prisma.listing.create({ data: { ...activeListingFields, ownerId: host.id } });
    authAs("test_bookings_host4", "host4@example.com");

    const res = await request(await createApp())
      .post("/api/v1/bookings/")
      .send({ listing_id: listing.id, start_date: "2026-09-01" });
    expect(res.status).toBe(400);
  });

  it("POST / rejects an end date on or before the start date", async () => {
    const host = await makeUser("test_bookings_host5", "host5@example.com", true);
    const listing = await prisma.listing.create({ data: { ...activeListingFields, ownerId: host.id } });
    await makeUser("test_bookings_renter3", "renter3@example.com", true);
    authAs("test_bookings_renter3", "renter3@example.com");

    const res = await request(await createApp())
      .post("/api/v1/bookings/")
      .send({ listing_id: listing.id, start_date: "2026-09-05", end_date: "2026-09-01" });
    expect(res.status).toBe(400);
  });

  it("GET / returns only the caller's own bookings", async () => {
    const host = await makeUser("test_bookings_host6", "host6@example.com", true);
    const listing = await prisma.listing.create({ data: { ...activeListingFields, ownerId: host.id } });
    const renter = await makeUser("test_bookings_renter4", "renter4@example.com", true);
    const other = await makeUser("test_bookings_renter5", "renter5@example.com", true);
    await prisma.booking.create({
      data: { listingId: listing.id, renterId: renter.id, startDate: new Date("2026-09-01"), amountCents: 15000 },
    });
    await prisma.booking.create({
      data: { listingId: listing.id, renterId: other.id, startDate: new Date("2026-09-01"), amountCents: 15000 },
    });

    authAs("test_bookings_renter4", "renter4@example.com");
    const res = await request(await createApp()).get("/api/v1/bookings/");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("GET / requires auth", async () => {
    anon();
    const res = await request(await createApp()).get("/api/v1/bookings/");
    expect(res.status).toBe(401);
  });

  it("POST /:id/cancel/ cancels the caller's own pending booking, 404s for someone else's", async () => {
    const host = await makeUser("test_bookings_host7", "host7@example.com", true);
    const listing = await prisma.listing.create({ data: { ...activeListingFields, ownerId: host.id } });
    const renter = await makeUser("test_bookings_renter6", "renter6@example.com", true);
    await makeUser("test_bookings_renter7", "renter7@example.com", true);
    const booking = await prisma.booking.create({
      data: { listingId: listing.id, renterId: renter.id, startDate: new Date("2026-09-01"), amountCents: 15000 },
    });

    authAs("test_bookings_renter7", "renter7@example.com");
    const forbiddenRes = await request(await createApp()).post(`/api/v1/bookings/${booking.id}/cancel/`);
    expect(forbiddenRes.status).toBe(404);

    authAs("test_bookings_renter6", "renter6@example.com");
    const okRes = await request(await createApp()).post(`/api/v1/bookings/${booking.id}/cancel/`);
    expect(okRes.status).toBe(200);
    expect(okRes.body.status).toBe("cancelled");
  });

  it("POST /:id/cancel/ rejects cancelling an already-cancelled booking", async () => {
    const host = await makeUser("test_bookings_host8", "host8@example.com", true);
    const listing = await prisma.listing.create({ data: { ...activeListingFields, ownerId: host.id } });
    const renter = await makeUser("test_bookings_renter8", "renter8@example.com", true);
    const booking = await prisma.booking.create({
      data: {
        listingId: listing.id,
        renterId: renter.id,
        startDate: new Date("2026-09-01"),
        amountCents: 15000,
        status: "cancelled",
      },
    });

    authAs("test_bookings_renter8", "renter8@example.com");
    const res = await request(await createApp()).post(`/api/v1/bookings/${booking.id}/cancel/`);
    expect(res.status).toBe(400);
  });
});
