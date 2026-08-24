// Same fix as health.test.ts (Task 7): this file predates clerkAuth being
// mounted globally and, unmocked, hits the real Clerk middleware with a
// placeholder publishable key, which 500s on format validation alone.
jest.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: jest.fn(),
  clerkClient: { users: { getUser: jest.fn() } },
}));

import request from "supertest";
import { createApp } from "../src/app";

describe("AdminJS", () => {
  it("serves a login page at /admin/login", async () => {
    const res = await request(await createApp()).get("/admin/login");
    expect(res.status).toBe(200);
    expect(res.text).toContain("login");
  });

  it("redirects unauthenticated requests to /admin away from the dashboard", async () => {
    const res = await request(await createApp()).get("/admin");
    expect([302, 401]).toContain(res.status);
  });
});
