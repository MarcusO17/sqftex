import Link from "next/link";
import { landingColors as c } from "./tokens";

export function HostBand() {
  return (
    <div
      style={{
        background: c.dark,
        padding: "72px 64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 40,
        flexWrap: "wrap",
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <h2
          style={{
            fontFamily: "var(--font-landing-heading), sans-serif",
            fontWeight: 700,
            fontSize: 26,
            color: "#F5F3EF",
            margin: "0 0 12px 0",
            textTransform: "uppercase",
            letterSpacing: "-0.01em",
          }}
        >
          Have spare space?
        </h2>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: c.muted, margin: 0 }}>
          A spare room, garage or empty floor can start earning within days. Verification is
          quick, and payouts are protected until move-in is confirmed.
        </p>
      </div>
      <Link
        href="/listings/new"
        style={{
          background: c.accent,
          color: "#FFFFFF",
          fontWeight: 700,
          fontSize: 15,
          padding: "16px 30px",
          borderRadius: 12,
          whiteSpace: "nowrap",
        }}
      >
        List your space
      </Link>
    </div>
  );
}
