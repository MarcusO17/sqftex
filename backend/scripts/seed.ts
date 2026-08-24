import "dotenv/config";
import { createClerkClient } from "@clerk/backend";
import { PrismaClient, VerificationStatus } from "@prisma/client";

const prisma = new PrismaClient();
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

const DEMO_DOMAIN = "sqftex.test";
const DEMO_PASSWORD = "Demo12345!";

const DEMO_USERS = [
  { key: "host.jane", isVerified: true },
  { key: "host.ravi", isVerified: true },
  { key: "host.pending", isVerified: false },
  { key: "renter.mei", isVerified: true },
  { key: "renter.arif", isVerified: true },
] as const;

type ListingSeed = {
  owner: (typeof DEMO_USERS)[number]["key"];
  title: string;
  category: "spare_room" | "garage" | "shoplot_back_room" | "warehouse_bay";
  sizeSqft: number;
  priceCents: number;
  priceUnit: "daily" | "monthly";
  status: "draft" | "active";
  address: string;
  lat: number;
  lng: number;
};

const DEMO_LISTINGS: ListingSeed[] = [
  { owner: "host.jane", title: "Spare Room in PJ Old Town", category: "spare_room", sizeSqft: 120, priceCents: 15000, priceUnit: "monthly", status: "active", address: "Jalan Timur, Petaling Jaya Old Town, Selangor", lat: 3.1073, lng: 101.6415 },
  { owner: "host.jane", title: "Double Garage Bay, Subang Jaya", category: "garage", sizeSqft: 280, priceCents: 45000, priceUnit: "monthly", status: "active", address: "SS15, Subang Jaya, Selangor", lat: 3.0738, lng: 101.5810 },
  { owner: "host.jane", title: "Small Storage Nook, Bangsar", category: "spare_room", sizeSqft: 60, priceCents: 800, priceUnit: "daily", status: "draft", address: "Jalan Telawi, Bangsar, Kuala Lumpur", lat: 3.1300, lng: 101.6700 },
  { owner: "host.ravi", title: "Shoplot Back Room, Klang", category: "shoplot_back_room", sizeSqft: 200, priceCents: 35000, priceUnit: "monthly", status: "active", address: "Batu Unjur, Klang, Selangor", lat: 3.0333, lng: 101.4500 },
  { owner: "host.ravi", title: "Warehouse Bay, Shah Alam", category: "warehouse_bay", sizeSqft: 1500, priceCents: 180000, priceUnit: "monthly", status: "active", address: "Seksyen 15, Shah Alam, Selangor", lat: 3.0654, lng: 101.5178 },
  { owner: "host.ravi", title: "Half Warehouse Bay, Cheras", category: "warehouse_bay", sizeSqft: 900, priceCents: 3500, priceUnit: "daily", status: "active", address: "Taman Segar, Cheras, Kuala Lumpur", lat: 3.0980, lng: 101.7360 },
];

async function findOrCreateClerkUser(email: string) {
  const existing = await clerkClient.users.getUserList({ emailAddress: [email] });
  if (existing.data.length > 0) return existing.data[0];
  return clerkClient.users.createUser({
    emailAddress: [email],
    password: DEMO_PASSWORD,
    skipPasswordChecks: true,
  });
}

async function main() {
  const flush = process.argv.includes("--flush");
  if (flush) {
    const deleted = await prisma.user.deleteMany({ where: { email: { endsWith: `@${DEMO_DOMAIN}` } } });
    console.log(`Flushed ${deleted.count} demo user(s) (and their listings, via cascade).`);
  }

  const users: Record<string, { id: number }> = {};
  for (const demo of DEMO_USERS) {
    const email = `${demo.key}@${DEMO_DOMAIN}`;
    const clerkUser = await findOrCreateClerkUser(email);
    const dbUser = await prisma.user.upsert({
      where: { clerkUserId: clerkUser.id },
      update: { email, isVerified: demo.isVerified },
      create: { clerkUserId: clerkUser.id, email, isVerified: demo.isVerified },
    });
    users[demo.key] = dbUser;
    console.log(`  ready   ${email}`);
  }

  for (const demo of DEMO_USERS) {
    if (!demo.isVerified) continue;
    const existing = await prisma.identityVerification.findFirst({
      where: { userId: users[demo.key].id, status: VerificationStatus.approved },
    });
    if (!existing) {
      await prisma.identityVerification.create({
        data: {
          userId: users[demo.key].id,
          nricPhotoUrl: "private/verification/demo-placeholder.jpg",
          status: VerificationStatus.approved,
          reviewedAt: new Date(),
          notes: "Auto-approved demo account.",
        },
      });
    }
  }
  const pendingExisting = await prisma.identityVerification.findFirst({
    where: { userId: users["host.pending"].id, status: VerificationStatus.pending },
  });
  if (!pendingExisting) {
    await prisma.identityVerification.create({
      data: {
        userId: users["host.pending"].id,
        nricPhotoUrl: "private/verification/demo-placeholder.jpg",
        status: VerificationStatus.pending,
      },
    });
  }

  let createdCount = 0;
  for (const seed of DEMO_LISTINGS) {
    const existing = await prisma.listing.findFirst({
      where: { ownerId: users[seed.owner].id, title: seed.title },
    });
    if (existing) continue;
    await prisma.listing.create({
      data: {
        ownerId: users[seed.owner].id,
        title: seed.title,
        description: `${seed.title} — available now. Clean, secure, easy access.`,
        category: seed.category,
        sizeSqft: seed.sizeSqft,
        priceCents: seed.priceCents,
        priceUnit: seed.priceUnit,
        status: seed.status,
        address: seed.address,
        accessRules: "Contact host to arrange a visit before move-in.",
        prohibitedItems: "No flammable, perishable, or illegal items.",
        lat: seed.lat,
        lng: seed.lng,
      },
    });
    createdCount += 1;
  }

  console.log(`\nDone. ${createdCount} new listing(s) created.`);
  console.log(`\nDemo accounts (all use the same password: ${DEMO_PASSWORD}):`);
  for (const demo of DEMO_USERS) {
    const role = demo.isVerified ? "verified" : "pending verification";
    console.log(`  ${demo.key}@${DEMO_DOMAIN}  (${role})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
