"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Heart } from "lucide-react";
import { createBooking } from "@/lib/api/bookings";
import { saveListing, unsaveListing } from "@/lib/api/savedListings";
import type { Listing } from "@/lib/api/listings";

// No real payment/escrow yet (see .claude/skills/booking-payment-flow) —
// submitting here creates a `pending` Booking row visible on /dashboard,
// nothing more. Copy below is deliberately honest about that instead of
// pretending this is a finished checkout flow.
export function BookingActionsCard({ listing, initialSaved }: { listing: Listing; initialSaved: boolean }) {
  const { userId, getToken } = useAuth();
  const router = useRouter();

  const [saved, setSaved] = useState(initialSaved);
  const [savePending, setSavePending] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  const priceReady = listing.price_cents !== null && listing.price_unit !== null;

  async function handleToggleSave() {
    if (!userId) {
      router.push("/login");
      return;
    }
    setSavePending(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in.");
      if (saved) {
        await unsaveListing(listing.id, token);
        setSaved(false);
      } else {
        await saveListing(listing.id, token);
        setSaved(true);
      }
    } catch {
      // Saving is a low-stakes affordance — fail silently rather than
      // interrupt the page with an error banner over a heart icon.
    } finally {
      setSavePending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      router.push("/login");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in.");
      await createBooking(
        { listing_id: listing.id, start_date: startDate, end_date: endDate || undefined },
        token
      );
      setRequested(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit that request right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 16,
        boxShadow: "0 2px 10px rgba(14,13,16,0.06)",
        padding: 28,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        position: "sticky",
        top: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        {priceReady ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 38, fontWeight: 800 }}>
              RM {(listing.price_cents! / 100).toFixed(2)}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>/ {listing.price_unit === "daily" ? "day" : "month"}</span>
          </div>
        ) : (
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--secondary)" }}>Price not yet set</div>
        )}

        <button
          type="button"
          onClick={handleToggleSave}
          disabled={savePending}
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved listings" : "Save this listing"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 999,
            border: "1px solid var(--line)",
            background: "var(--paper)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Heart size={18} color={saved ? "var(--secondary)" : "var(--ink)"} fill={saved ? "var(--secondary)" : "none"} />
        </button>
      </div>

      {requested ? (
        <p style={{ fontSize: 14, lineHeight: 1.6, fontWeight: 600, color: "var(--primary-dark)" }}>
          Request sent — track it from your{" "}
          <a href="/dashboard" style={{ textDecoration: "underline" }}>
            dashboard
          </a>
          .
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {error && <p role="alert" style={{ fontSize: 13, color: "var(--secondary-dark)" }}>{error}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="field" style={{ gap: 2 }}>
              <label htmlFor="start_date" style={{ fontSize: 11 }}>Move-in</label>
              <input
                id="start_date"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="field" style={{ gap: 2 }}>
              <label htmlFor="end_date" style={{ fontSize: 11 }}>Move-out (optional)</label>
              <input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={!priceReady || submitting}>
            {submitting ? "Sending..." : "REQUEST TO BOOK"}
          </button>

          <p style={{ fontSize: 13, lineHeight: 1.6, fontWeight: 500 }}>
            Payment isn&apos;t wired up yet — this sends a request the host can see, held as{" "}
            <strong>pending</strong> on your dashboard. Real payment capture and escrow are coming next.
          </p>
        </form>
      )}

      <div
        style={{
          borderTop: "1px solid var(--line)",
          paddingTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600 }}>
          You&apos;ll need ID verification before this booking can be confirmed.
        </p>
      </div>
    </div>
  );
}
