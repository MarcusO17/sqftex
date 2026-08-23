import { prisma } from "../src/prisma";

describe("Prisma client", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("can create, read, and delete a User row", async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: "test_clerk_prisma_1", email: "prisma-test@example.com" },
    });
    expect(user.id).toEqual(expect.any(Number));
    expect(user.isVerified).toBe(false);

    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.email).toBe("prisma-test@example.com");

    await prisma.user.delete({ where: { id: user.id } });
    const gone = await prisma.user.findUnique({ where: { id: user.id } });
    expect(gone).toBeNull();
  });
});
