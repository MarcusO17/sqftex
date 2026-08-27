import { BookingStatus, ListingStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";
import { toBookingJSON } from "../serializers/booking";

export const bookingsRouter = Router();

const bookingInclude = { listing: { include: { photos: true } } } as const;

// Renter-only for now — no real payment/escrow yet, see
// .claude/skills/booking-payment-flow. Dates as plain strings (not
// z.string().datetime()) since the frontend sends `<input type="date">`
// values ("YYYY-MM-DD"), not full ISO datetimes.
const dateField = z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), { message: "Invalid date." });
const createBookingSchema = z.object({
  listing_id: z.number().int().positive(),
  start_date: dateField,
  end_date: dateField.optional(),
});

bookingsRouter.get("/", requireAuth, async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { renterId: req.dbUser!.id },
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json(bookings.map(toBookingJSON));
});

// Creates a `pending` booking row only — no Curlec payment capture. Freezes
// `amountCents` from the listing's current price at booking time (same
// reasoning as `commissionCents` normally would: a later price change on
// the listing must not retroactively change what an existing booking
// shows). `commissionCents` stays null until real payment capture computes
// and freezes it for good — never backfill it from a live rate later.
// Double-booking/availability overlap checks are deferred to that same
// follow-up work, per the booking-payment-flow skill's "provisionally
// held" step, which doesn't apply yet without real payment to hold against.
bookingsRouter.post("/", requireAuth, async (req, res) => {
  if (!req.dbUser!.isVerified) {
    res.status(400).json({ detail: "Only ID-verified renters can request a booking." });
    return;
  }

  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ detail: parsed.error.flatten() });
    return;
  }

  const listing = await prisma.listing.findUnique({
    where: { id: parsed.data.listing_id },
    include: { owner: true },
  });
  if (!listing || listing.status !== ListingStatus.active) {
    res.status(404).json({ detail: "Not found." });
    return;
  }
  if (listing.ownerId === req.dbUser!.id) {
    res.status(400).json({ detail: "You can't book your own listing." });
    return;
  }
  // Defensive per the booking-payment-flow skill: a listing can't reach
  // `active` without its owner being verified at listing-creation time, but
  // check explicitly here rather than trust that upstream state still
  // holds (verification could in principle be revoked afterward).
  if (!listing.owner.isVerified) {
    res.status(400).json({ detail: "This listing's host has not completed verification." });
    return;
  }

  const startDate = new Date(parsed.data.start_date);
  const endDate = parsed.data.end_date ? new Date(parsed.data.end_date) : null;
  if (endDate && endDate <= startDate) {
    res.status(400).json({ detail: "End date must be after the start date." });
    return;
  }

  const booking = await prisma.booking.create({
    data: {
      listingId: listing.id,
      renterId: req.dbUser!.id,
      startDate,
      endDate,
      amountCents: listing.priceCents,
    },
    include: bookingInclude,
  });
  res.status(201).json(toBookingJSON(booking));
});

bookingsRouter.post("/:id/cancel/", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing || existing.renterId !== req.dbUser!.id) {
    res.status(404).json({ detail: "Not found." });
    return;
  }
  if (existing.status !== BookingStatus.pending) {
    res.status(400).json({ detail: "Only a pending booking can be cancelled." });
    return;
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: { status: BookingStatus.cancelled },
    include: bookingInclude,
  });
  res.json(toBookingJSON(booking));
});
