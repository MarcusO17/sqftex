import type { User } from "@prisma/client";
import { toUserJSON } from "../../src/serializers/user";

describe("toUserJSON", () => {
  it("maps a Prisma User to the API's snake_case shape", () => {
    const user: User = {
      id: 1,
      clerkUserId: "clerk_1",
      email: "a@example.com",
      username: "alice",
      isVerified: true,
      createdAt: new Date(),
    };
    expect(toUserJSON(user)).toEqual({
      id: 1,
      email: "a@example.com",
      username: "alice",
      is_verified: true,
    });
  });
});
