import { ListingCategory, ListingStatus, PriceUnit } from "@prisma/client";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { attachDbUserIfPresent, requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";
import { toListingJSON } from "../serializers/listing";
import { uploadPublicObject } from "../storage/r2";

export const listingsRouter = Router();

const listingInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.nativeEnum(ListingCategory),
  size_sqft: z.number().int().positive(),
  price_cents: z.number().int().positive().optional(),
  price_unit: z.nativeEnum(PriceUnit).optional(),
  address: z.string().min(1).optional(),
  access_rules: z.string().optional().default(""),
  prohibited_items: z.string().optional().default(""),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// The zod schema above mirrors the API's snake_case JSON contract, but
// Prisma's generated types expect camelCase field names. Map explicitly
// rather than spreading the parsed object straight into Prisma calls.
// Two variants because create's input is fully required while update's is
// partial — collapsing them into one Partial-typed helper would make every
// field optional on the create path too, defeating Prisma's required-field
// checking.
function mapCreateFields(input: z.infer<typeof listingInputSchema>) {
  const { size_sqft, price_cents, price_unit, access_rules, prohibited_items, latitude, longitude, ...rest } = input;
  return {
    ...rest,
    sizeSqft: size_sqft,
    priceCents: price_cents ?? null,
    priceUnit: price_unit ?? null,
    accessRules: access_rules,
    prohibitedItems: prohibited_items,
    lat: latitude ?? null,
    lng: longitude ?? null,
  };
}

function mapUpdateFields(input: Partial<z.infer<typeof listingInputSchema>>) {
  const { size_sqft, price_cents, price_unit, access_rules, prohibited_items, latitude, longitude, ...rest } = input;
  return {
    ...rest,
    ...(size_sqft !== undefined ? { sizeSqft: size_sqft } : {}),
    ...(price_cents !== undefined ? { priceCents: price_cents } : {}),
    ...(price_unit !== undefined ? { priceUnit: price_unit } : {}),
    ...(access_rules !== undefined ? { accessRules: access_rules } : {}),
    ...(prohibited_items !== undefined ? { prohibitedItems: prohibited_items } : {}),
    ...(latitude !== undefined ? { lat: latitude } : {}),
    ...(longitude !== undefined ? { lng: longitude } : {}),
  };
}

async function findListingForRequest(id: number, dbUserId?: number) {
  const listing = await prisma.listing.findUnique({ where: { id }, include: { photos: true } });
  if (!listing) return null;
  if (listing.status === ListingStatus.active) return listing;
  if (dbUserId && listing.ownerId === dbUserId) return listing;
  return null;
}

listingsRouter.get("/", attachDbUserIfPresent, async (req, res) => {
  const where = req.dbUser
    ? { OR: [{ status: ListingStatus.active }, { ownerId: req.dbUser.id }] }
    : { status: ListingStatus.active };

  const listings = await prisma.listing.findMany({
    where,
    include: { photos: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(listings.map(toListingJSON));
});

listingsRouter.post("/", requireAuth, async (req, res) => {
  if (!req.dbUser!.isVerified) {
    res.status(400).json({ detail: "Only ID-verified hosts can create a listing." });
    return;
  }

  const parsed = listingInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ detail: parsed.error.flatten() });
    return;
  }
  const listing = await prisma.listing.create({
    data: { ...mapCreateFields(parsed.data), ownerId: req.dbUser!.id },
    include: { photos: true },
  });
  res.status(201).json(toListingJSON(listing));
});

listingsRouter.get("/:id/", attachDbUserIfPresent, async (req, res) => {
  const listing = await findListingForRequest(Number(req.params.id), req.dbUser?.id);
  if (!listing) {
    res.status(404).json({ detail: "Not found." });
    return;
  }
  res.json(toListingJSON(listing));
});

listingsRouter.patch("/:id/", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== req.dbUser!.id) {
    res.status(404).json({ detail: "Not found." });
    return;
  }

  const parsed = listingInputSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ detail: parsed.error.flatten() });
    return;
  }
  const listing = await prisma.listing.update({
    where: { id },
    data: mapUpdateFields(parsed.data),
    include: { photos: true },
  });
  res.json(toListingJSON(listing));
});

listingsRouter.delete("/:id/", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== req.dbUser!.id) {
    res.status(404).json({ detail: "Not found." });
    return;
  }
  await prisma.listing.delete({ where: { id } });
  res.status(204).end();
});

const upload = multer({ storage: multer.memoryStorage() });

listingsRouter.post("/:id/photos/", requireAuth, upload.single("image"), async (req, res) => {
  const id = Number(req.params.id);
  const listing = await prisma.listing.findUnique({ where: { id }, include: { photos: true } });
  if (!listing || listing.ownerId !== req.dbUser!.id) {
    res.status(404).json({ detail: "Not found." });
    return;
  }
  if (!req.file) {
    res.status(400).json({ detail: "No image file provided." });
    return;
  }

  const imageUrl = await uploadPublicObject(req.file.buffer, req.file.mimetype, req.file.originalname);
  const photo = await prisma.listingPhoto.create({
    data: { listingId: id, imageUrl, order: listing.photos.length },
  });
  res.status(201).json({ id: photo.id, image: photo.imageUrl, order: photo.order });
});

listingsRouter.post("/:id/publish/", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const listing = await prisma.listing.findUnique({ where: { id }, include: { photos: true } });
  if (!listing || listing.ownerId !== req.dbUser!.id) {
    res.status(404).json({ detail: "Not found." });
    return;
  }
  if (listing.photos.length === 0) {
    res.status(400).json({ detail: "Add at least one photo before publishing." });
    return;
  }
  const updated = await prisma.listing.update({
    where: { id },
    data: { status: ListingStatus.active },
    include: { photos: true },
  });
  res.json(toListingJSON(updated));
});
