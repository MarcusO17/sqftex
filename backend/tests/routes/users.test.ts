jest.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: jest.fn(),
  clerkClient: { users: { getUser: jest.fn() } },
}));
jest.mock("../../src/storage/r2", () => ({
  uploadPrivateObject: jest.fn().mockResolvedValue("private/verification/fake.jpg"),
}));

import request from "supertest";
import { clerkClient, getAuth } from "@clerk/express";
import { createApp } from "../../src/app";
import { prisma } from "../../src/prisma";

describe("users routes", () => {
  afterEach(async () => {
    await prisma.identityVerification.deleteMany({
      where: { user: { clerkUserId: { startsWith: "test_users_" } } },
    });
    await prisma.user.deleteMany({ where: { clerkUserId: { startsWith: "test_users_" } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("GET /api/v1/users/me/ returns 401 when unauthenticated", async () => {
    (getAuth as jest.Mock).mockReturnValue({ userId: null });
    const res = await request(await createApp()).get("/api/v1/users/me/");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/users/me/ returns the local user's data", async () => {
    (getAuth as jest.Mock).mockReturnValue({ userId: "test_users_1" });
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
      emailAddresses: [{ emailAddress: "me-test@example.com" }],
    });

    const res = await request(await createApp()).get("/api/v1/users/me/");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: "me-test@example.com", is_verified: false });
  });

  it("POST /api/v1/users/verification/ creates a pending verification, then 400s on a second attempt", async () => {
    (getAuth as jest.Mock).mockReturnValue({ userId: "test_users_2" });
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
      emailAddresses: [{ emailAddress: "verify-test@example.com" }],
    });

    const first = await request(await createApp())
      .post("/api/v1/users/verification/")
      .attach("nric_photo", Buffer.from("fake-image-bytes"), "nric.jpg");
    expect(first.status).toBe(201);
    expect(first.body.status).toBe("pending");

    const second = await request(await createApp())
      .post("/api/v1/users/verification/")
      .attach("nric_photo", Buffer.from("fake-image-bytes"), "nric.jpg");
    expect(second.status).toBe(400);
  });

  it("PATCH /api/v1/users/me/ updates username, phone, and address", async () => {
    (getAuth as jest.Mock).mockReturnValue({ userId: "test_users_3" });
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
      emailAddresses: [{ emailAddress: "patch-test@example.com" }],
    });

    const res = await request(await createApp()).patch("/api/v1/users/me/").send({
      username: "siti",
      phone: "+60 12-345 6789",
      address: "1 Jalan Test",
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      username: "siti",
      phone: "+60 12-345 6789",
      address: "1 Jalan Test",
    });
  });

  it("POST /api/v1/users/me/verify-stub/ sets is_verified in non-production", async () => {
    (getAuth as jest.Mock).mockReturnValue({ userId: "test_users_4" });
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
      emailAddresses: [{ emailAddress: "verify-stub-test@example.com" }],
    });

    const res = await request(await createApp()).post("/api/v1/users/me/verify-stub/");
    expect(res.status).toBe(200);
    expect(res.body.is_verified).toBe(true);
  });

  it("POST /api/v1/users/me/verify-stub/ 404s in production", async () => {
    (getAuth as jest.Mock).mockReturnValue({ userId: "test_users_5" });
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
      emailAddresses: [{ emailAddress: "verify-stub-prod-test@example.com" }],
    });

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const res = await request(await createApp()).post("/api/v1/users/me/verify-stub/");
      expect(res.status).toBe(404);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
