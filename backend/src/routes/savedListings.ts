import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";
import { toSavedListingJSON } from "../serializers/savedListing";

export const savedListingsRouter = Router();

const savedListingInclude = { listing: { include: { photos: true } } } as const;

const saveInputSchema = z.object({ listing_id: z.number().int().positive() });

savedListingsRouter.get("/", requireAuth, async (req, res) => {
  const saved = await prisma.savedListing.findMany({
    where: { userId: req.dbUser!.id },
    include: savedListingInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json(saved.map(toSavedListingJSON));
});

// Upsert, not create — saving an already-saved listing just returns the
// existing row instead of erroring on the unique (userId, listingId)
// constraint. Keeps the frontend's "save" action idempotent.
savedListingsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = saveInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ detail: parsed.error.flatten() });
    return;
  }

  const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listing_id } });
  if (!listing) {
    res.status(404).json({ detail: "Not found." });
    return;
  }

  const saved = await prisma.savedListing.upsert({
    where: { userId_listingId: { userId: req.dbUser!.id, listingId: listing.id } },
    update: {},
    create: { userId: req.dbUser!.id, listingId: listing.id },
    include: savedListingInclude,
  });
  res.status(201).json(toSavedListingJSON(saved));
});

// Keyed by listing id, not the join row's own id — the frontend only ever
// knows "this listing" (a card, a detail page), never the SavedListing
// row's id. deleteMany makes unsaving idempotent whether or not it was
// saved in the first place.
savedListingsRouter.delete("/:listingId/", requireAuth, async (req, res) => {
  await prisma.savedListing.deleteMany({
    where: { userId: req.dbUser!.id, listingId: Number(req.params.listingId) },
  });
  res.status(204).end();
});
