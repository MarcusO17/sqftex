import Link from "next/link";
import { NavBar } from "@/components/layout/NavBar";

export default function Home() {
  return (
    <div>
      <NavBar variant="guest" />

      {/* Hero */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          padding: "96px 64px",
          background: "var(--primary)",
        }}
      >
        <div className="label" style={{ color: "#fff", opacity: 0.85 }}>
          Microwarehousing for Malaysia
        </div>
        <h1 style={{ fontSize: 68, lineHeight: 0.98, maxWidth: 820, color: "#fff" }}>
          SPARE SPACE, PUT TO WORK.
        </h1>
        <p style={{ fontSize: 19, lineHeight: 1.55, color: "#fff", opacity: 0.92, maxWidth: 560 }}>
          sqftex connects Space Owners with square footage to spare and Space Seekers who need
          short- or mid-term storage. No long leases. No warehouse contracts.
        </p>
        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
          <Link
            href="/listings"
            style={{
              background: "var(--secondary)",
              color: "var(--ink)",
              padding: "15px 28px",
              borderRadius: 2,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            Browse space
          </Link>
          <Link
            href="/listings/new"
            style={{
              background: "transparent",
              color: "#fff",
              border: "2px solid #fff",
              padding: "15px 28px",
              borderRadius: 2,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            List your space
          </Link>
        </div>
      </div>

      {/* Two audiences */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: "72px 64px",
            borderRight: "3px solid var(--ink)",
            borderBottom: "3px solid var(--ink)",
          }}
        >
          <div className="label" style={{ color: "var(--primary)" }}>
            For space seekers
          </div>
          <h3 style={{ fontSize: 32, lineHeight: 1.1 }}>STORAGE THAT FITS THE JOB.</h3>
          <p style={{ fontSize: 16, lineHeight: 1.6 }}>
            Book verified space by the day or the month. Payment is held in escrow until
            you&apos;ve confirmed move-in.
          </p>
          <Link href="/listings" style={{ fontSize: 16, fontWeight: 700, color: "var(--primary)", marginTop: 4 }}>
            Browse listings &rarr;
          </Link>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: "72px 64px",
            borderBottom: "3px solid var(--ink)",
          }}
        >
          <div className="label" style={{ color: "var(--secondary-dark)" }}>
            For space owners
          </div>
          <h3 style={{ fontSize: 32, lineHeight: 1.1 }}>TURN EMPTY SPACE INTO INCOME.</h3>
          <p style={{ fontSize: 16, lineHeight: 1.6 }}>
            List spare space you already have. You set the price; we handle payment, ID
            verification, and the paperwork.
          </p>
          <Link href="/listings/new" style={{ fontSize: 16, fontWeight: 700, color: "var(--secondary-dark)", marginTop: 4 }}>
            List your space &rarr;
          </Link>
        </div>
      </div>

      {/* Trust strip */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 56,
          padding: "28px 64px",
          background: "var(--card)",
          borderBottom: "3px solid var(--ink)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2">
            <path d="M12 3l7 3.5v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9v-5L12 3z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600 }}>NRIC-verified hosts and renters</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2">
            <rect x="3" y="9" width="18" height="12" rx="1" />
            <path d="M7 9V6a5 5 0 0110 0v3" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Payments held in escrow until move-in</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2">
            <path d="M3 11l9-7 9 7" />
            <path d="M5 10v9h14v-9" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Direct, visiting-only access</span>
        </div>
      </div>

      {/* How it works */}
      <div style={{ display: "flex", flexDirection: "column", gap: 56, padding: "96px 64px" }}>
        <h2 style={{ fontSize: 38, textAlign: "center" }}>HOW IT WORKS</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 48,
            maxWidth: 1100,
            width: "100%",
            margin: "0 auto",
          }}
        >
          {[
            { n: 1, title: "BROWSE OR LIST", body: "Search verified space near you, or list what you have spare in minutes." },
            { n: 2, title: "BOOK SECURELY", body: "Payment is captured at booking and held in escrow, not paid out yet." },
            { n: 3, title: "MOVE IN, CONFIRM", body: "Confirm move-in to release payment — or it auto-releases after the window." },
          ].map((step) => (
            <div key={step.n} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--primary)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-heading)",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {step.n}
              </div>
              <h4 style={{ fontSize: 19 }}>{step.title}</h4>
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "40px 64px",
          background: "var(--ink)",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 900, color: "#fff" }}>
            sqftex
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            Microwarehousing for Malaysia.
          </div>
        </div>
      </div>
    </div>
  );
}
