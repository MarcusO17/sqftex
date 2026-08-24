jest.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: jest.fn(),
  clerkClient: {
    users: { getUser: jest.fn() },
  },
}));

import express from "express";
import request from "supertest";
import { clerkClient, getAuth } from "@clerk/express";
import { attachDbUserIfPresent, requireAuth } from "../../src/middleware/auth";
import { prisma } from "../../src/prisma";

describe("auth middleware", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { clerkUserId: { startsWith: "test_auth_" } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("requireAuth returns 401 when there is no authenticated Clerk user", async () => {
    (getAuth as jest.Mock).mockReturnValue({ userId: null });
    const app = express();
    app.get("/protected", requireAuth, (req, res) => res.json({ ok: true }));

    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
  });

  it("requireAuth creates a local User row on first authenticated request", async () => {
    (getAuth as jest.Mock).mockReturnValue({ userId: "test_auth_1" });
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
      emailAddresses: [{ emailAddress: "auth-test@example.com" }],
    });

    const app = express();
    app.get("/protected", requireAuth, (req, res) => res.json({ id: req.dbUser?.id }));

    const res = await request(app).get("/protected");
    expect(res.status).toBe(200);

    const dbUser = await prisma.user.findUnique({ where: { clerkUserId: "test_auth_1" } });
    expect(dbUser?.email).toBe("auth-test@example.com");
  });

  it("attachDbUserIfPresent does not fail the request when unauthenticated", async () => {
    (getAuth as jest.Mock).mockReturnValue({ userId: null });
    const app = express();
    app.get("/optional", attachDbUserIfPresent, (req, res) => res.json({ hasUser: !!req.dbUser }));

    const res = await request(app).get("/optional");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ hasUser: false });
  });
});
