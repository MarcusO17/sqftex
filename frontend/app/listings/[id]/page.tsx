import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getListing } from "@/lib/api/listings";
import { categoryLabel } from "@/lib/listingCategories";
import { NavBar } from "@/components/layout/NavBar";

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const { getToken } = await auth();
  const token = await getToken();
  const listing = await getListing(Number(params.id), token);
  const ringgit = (listing.price_cents! / 100).toFixed(2);
  const unitLabel = listing.price_unit === "daily" ? "day" : "month";

  return (
    <div>
      <NavBar variant="app" />

      <div style={{ padding: "32px 64px 80px" }}>
        <Link href="/listings" className="nav-link" style={{ fontSize: 14 }}>
          &larr; Back to results
        </Link>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr",
            gap: 56,
            marginTop: 24,
            alignItems: "start",
          }}
        >
          {/* Left: photos + details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: listing.photos.length > 0 ? "repeat(auto-fill, minmax(200px, 1fr))" : "1fr",
                gap: 10,
              }}
            >
              {listing.photos.length > 0 ? (
                listing.photos.map((photo) => (
                  // Frame clips the pop so a hovered photo scales up inside
                  // its own rounded border instead of spilling over the
                  // grid gap into neighboring photos.
                  <div
                    key={photo.id}
                    style={{
                      height: 260,
                      overflow: "hidden",
                      border: "1px solid var(--line)",
                      borderRadius: 14,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.image}
                      alt={listing.title}
                      className="h-full w-full object-cover transition-transform duration-300 ease-out hover:scale-110"
                    />
                  </div>
                ))
              ) : (
                <div
                  style={{
                    height: 260,
                    background: "var(--card)",
                    border: "1px solid var(--line)",
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--line)" strokeWidth="1.4">
                    <rect x="3" y="9" width="18" height="12" rx="1" />
                    <path d="M7 9V6a5 5 0 0110 0v3" />
                  </svg>
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                paddingBottom: 24,
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div className="label" style={{ color: "var(--primary)" }}>
                {categoryLabel(listing.category)}
              </div>
              <h1 style={{ fontSize: 34 }}>{listing.title.toUpperCase()}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2">
                  <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" />
                  <circle cx="12" cy="9" r="2.3" />
                </svg>
                {listing.address!} &middot; {listing.size_sqft} sqft
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                paddingBottom: 24,
                borderBottom: "1px solid var(--line)",
              }}
            >
              <h3 style={{ fontSize: 19 }}>ABOUT THIS SPACE</h3>
              <p style={{ fontSize: 15, lineHeight: 1.7, fontWeight: 500 }}>{listing.description}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ fontSize: 19 }}>ACCESS RULES</h3>
              <p style={{ fontSize: 15, lineHeight: 1.7, fontWeight: 500 }}>
                {listing.access_rules || "Coordinate access directly with the host."}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ fontSize: 19 }}>PROHIBITED ITEMS</h3>
              <p style={{ fontSize: 15, lineHeight: 1.7, fontWeight: 500 }}>
                {listing.prohibited_items || "None specified."}
              </p>
            </div>
          </div>

          {/* Right: booking card */}
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
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 38, fontWeight: 800 }}>
                RM {ringgit}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>/ {unitLabel}</span>
            </div>

            <button className="btn-primary" style={{ width: "100%" }} disabled title="Booking isn't open yet">
              REQUEST TO BOOK
            </button>

            <p style={{ fontSize: 13, lineHeight: 1.6, fontWeight: 500 }}>
              Bookings aren&apos;t open yet. Once they are, payment is captured at booking and
              held in escrow until you confirm move-in.
            </p>

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
        </div>
      </div>
    </div>
  );
}
