"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { cancelBooking, type Booking } from "@/lib/api/bookings";
import { formatPrice } from "@/lib/format";

const STATUS_LABEL: Record<Booking["status"], string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<Booking["status"], string> = {
  pending: "var(--secondary-dark)",
  confirmed: "var(--primary-dark)",
  cancelled: "hsl(var(--muted-foreground))",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

export function BookingsList({ bookings: initialBookings }: { bookings: Booking[] }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel(id: number) {
    setError(null);
    setCancellingId(id);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in.");
      const updated = await cancelBooking(id, token);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't cancel that booking right now.");
    } finally {
      setCancellingId(null);
    }
  }

  if (bookings.length === 0) {
    return (
      <p style={{ fontSize: 14, opacity: 0.65 }}>
        No bookings yet. <Link href="/listings" className="nav-link">Browse listings</Link> to request one.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {error && <p role="alert" style={{ fontSize: 13, color: "var(--secondary-dark)" }}>{error}</p>}
      {bookings.map((booking) => (
        <div
          key={booking.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            padding: "16px 20px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <Link href={`/listings/${booking.listing.id}`} style={{ fontSize: 16, fontWeight: 700 }}>
              {booking.listing.title}
            </Link>
            <span style={{ fontSize: 13.5, opacity: 0.7 }}>
              {formatDate(booking.start_date)}
              {booking.end_date ? ` – ${formatDate(booking.end_date)}` : " onward"}
            </span>
          </div>

          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}>
            {formatPrice(booking.listing)}
          </div>

          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: STATUS_COLOR[booking.status],
              whiteSpace: "nowrap",
            }}
          >
            {STATUS_LABEL[booking.status]}
          </span>

          {booking.status === "pending" && (
            <button
              type="button"
              className="btn-outline"
              style={{ padding: "8px 16px", fontSize: 13 }}
              onClick={() => handleCancel(booking.id)}
              disabled={cancellingId === booking.id}
            >
              {cancellingId === booking.id ? "Cancelling..." : "Cancel"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
