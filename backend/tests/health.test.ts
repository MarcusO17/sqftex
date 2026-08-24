jest.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: jest.fn(),
  clerkClient: { users: { getUser: jest.fn() } },
}));

import request from "supertest";
import { createApp } from "../src/app";

describe("GET /health", () => {
  it("returns ok status", async () => {
    const app = await createApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
