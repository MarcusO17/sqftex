import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { NavBar } from "@/components/layout/NavBar";
import { listMyBookings } from "@/lib/api/bookings";
import { listSavedListings } from "@/lib/api/savedListings";
import { BookingsList } from "@/components/dashboard/BookingsList";
import { SavedListingsGrid } from "@/components/dashboard/SavedListingsGrid";

// Renter-facing "my space" dashboard — bookings + saved listings change per
// visit, and both fetches depend on the signed-in caller, so this can't be
// statically prerendered. Same reasoning as /listings and /profile.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId, getToken } = await auth();
  if (!userId) {
    redirect("/login");
  }

  const token = await getToken();
  if (!token) {
    redirect("/login");
  }

  const [bookings, savedListings] = await Promise.all([listMyBookings(token), listSavedListings(token)]);

  return (
    <div>
      <NavBar variant="app" />
      <div style={{ display: "flex", justifyContent: "center", padding: "56px 32px 96px" }}>
        <div style={{ width: "100%", maxWidth: 1040, display: "flex", flexDirection: "column", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="label">Your space</div>
            <h1 style={{ fontSize: 34 }}>Dashboard</h1>
          </div>

          <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ fontSize: 20 }}>Your bookings</h2>
            <BookingsList bookings={bookings} />
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ fontSize: 20 }}>Saved listings</h2>
            <SavedListingsGrid savedListings={savedListings} />
          </section>
        </div>
      </div>
    </div>
  );
}
