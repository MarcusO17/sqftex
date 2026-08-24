import type { User } from "@prisma/client";
import { toUserJSON } from "../../src/serializers/user";

describe("toUserJSON", () => {
  it("maps a Prisma User to the API's snake_case shape", () => {
    const createdAt = new Date();
    const user: User = {
      id: 1,
      clerkUserId: "clerk_1",
      email: "a@example.com",
      username: "alice",
      phone: "+60 12-345 6789",
      address: "1 Jalan Test",
      role: "renter",
      isVerified: true,
      createdAt,
    };
    expect(toUserJSON(user)).toEqual({
      id: 1,
      email: "a@example.com",
      username: "alice",
      phone: "+60 12-345 6789",
      address: "1 Jalan Test",
      role: "renter",
      is_verified: true,
      created_at: createdAt.toISOString(),
    });
  });
});
