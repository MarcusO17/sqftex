jest.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: jest.fn(),
  clerkClient: { users: { getUser: jest.fn() } },
}));
jest.mock("../../src/storage/r2", () => ({
  uploadPublicObject: jest.fn().mockResolvedValue("https://media.sqftex.test/public/listings/fake.jpg"),
}));

import request from "supertest";
import { clerkClient, getAuth } from "@clerk/express";
import { createApp } from "../../src/app";
import { prisma } from "../../src/prisma";

async function makeUser(clerkUserId: string, email: string) {
  return prisma.user.create({ data: { clerkUserId, email, isVerified: true } });
}

function authAs(clerkUserId: string, email: string) {
  (getAuth as jest.Mock).mockReturnValue({ userId: clerkUserId });
  (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
    emailAddresses: [{ emailAddress: email }],
  });
}

async function makeDraftListing(ownerId: number) {
  return prisma.listing.create({
    data: {
      title: "Spare Room", description: "x", category: "spare_room", sizeSqft: 100,
      priceCents: 1000, priceUnit: "monthly", address: "x", lat: 1, lng: 1,
      status: "draft", ownerId,
    },
  });
}

describe("listings photos + publish routes", () => {
  afterEach(async () => {
    await prisma.listing.deleteMany({ where: { owner: { clerkUserId: { startsWith: "test_pub_" } } } });
    await prisma.user.deleteMany({ where: { clerkUserId: { startsWith: "test_pub_" } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("POST /:id/publish/ rejects a listing with no photos", async () => {
    const owner = await makeUser("test_pub_1", "pub1@example.com");
    const listing = await makeDraftListing(owner.id);
    authAs("test_pub_1", "pub1@example.com");

    const res = await request(await createApp()).post(`/api/v1/listings/${listing.id}/publish/`);
    expect(res.status).toBe(400);
  });

  it("POST /:id/photos/ then POST /:id/publish/ activates the listing", async () => {
    const owner = await makeUser("test_pub_2", "pub2@example.com");
    const listing = await makeDraftListing(owner.id);
    authAs("test_pub_2", "pub2@example.com");

    const photoRes = await request(await createApp())
      .post(`/api/v1/listings/${listing.id}/photos/`)
      .attach("image", Buffer.from("fake-image-bytes"), "cover.jpg");
    expect(photoRes.status).toBe(201);
    expect(photoRes.body.image).toBe("https://media.sqftex.test/public/listings/fake.jpg");

    const publishRes = await request(await createApp()).post(`/api/v1/listings/${listing.id}/publish/`);
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.status).toBe("active");
    expect(publishRes.body.photos).toHaveLength(1);
  });

  it("POST /:id/photos/ 404s for a non-owner", async () => {
    const owner = await makeUser("test_pub_3", "pub3@example.com");
    const other = await makeUser("test_pub_4", "pub4@example.com");
    const listing = await makeDraftListing(owner.id);

    authAs("test_pub_4", "pub4@example.com");
    const res = await request(await createApp())
      .post(`/api/v1/listings/${listing.id}/photos/`)
      .attach("image", Buffer.from("fake"), "x.jpg");
    expect(res.status).toBe(404);
  });
});
