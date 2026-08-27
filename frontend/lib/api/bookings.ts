import { apiFetch } from "./client";
import type { Listing } from "./listings";

export interface Booking {
  id: number;
  listing: Listing;
  status: "pending" | "confirmed" | "cancelled";
  start_date: string;
  end_date: string | null;
  amount_cents: number | null;
  commission_cents: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBookingInput {
  listing_id: number;
  start_date: string;
  end_date?: string;
}

export async function listMyBookings(token: string): Promise<Booking[]> {
  return apiFetch<Booking[]>("/api/v1/bookings/", {}, token);
}

export async function createBooking(input: CreateBookingInput, token: string): Promise<Booking> {
  return apiFetch<Booking>(
    "/api/v1/bookings/",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
    token
  );
}

export async function cancelBooking(id: number, token: string): Promise<Booking> {
  return apiFetch<Booking>(`/api/v1/bookings/${id}/cancel/`, { method: "POST" }, token);
}
