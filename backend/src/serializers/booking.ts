import type { Booking, Listing, ListingPhoto } from "@prisma/client";
import { toListingJSON } from "./listing";

export interface BookingJSON {
  id: number;
  listing: ReturnType<typeof toListingJSON>;
  status: string;
  start_date: string;
  end_date: string | null;
  amount_cents: number | null;
  commission_cents: number | null;
  created_at: string;
  updated_at: string;
}

type BookingWithListing = Booking & { listing: Listing & { photos: ListingPhoto[] } };

export function toBookingJSON(booking: BookingWithListing): BookingJSON {
  return {
    id: booking.id,
    listing: toListingJSON(booking.listing),
    status: booking.status,
    start_date: booking.startDate.toISOString(),
    end_date: booking.endDate ? booking.endDate.toISOString() : null,
    amount_cents: booking.amountCents,
    commission_cents: booking.commissionCents,
    created_at: booking.createdAt.toISOString(),
    updated_at: booking.updatedAt.toISOString(),
  };
}
