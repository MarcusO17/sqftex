import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapEmbed } from "./MapEmbed";
import { landingColors as c } from "./tokens";

const locations = ["Petaling Jaya", "Subang Jaya", "Shah Alam", "Cheras"];

function LocationChip({ label, active }: { label: string; active: boolean }) {
  return (
    <Button
      asChild
      className="h-auto rounded-lg px-4 py-3 text-xs font-bold"
      style={{
        border: `1px solid ${active ? "var(--landing-btn-bg)" : "var(--landing-line)"}`,
        color: active ? "var(--landing-btn-text)" : "var(--landing-muted)",
        background: active ? "var(--landing-btn-bg)" : "transparent",
      }}
    >
      <Link href="/listings">{label}</Link>
    </Button>
  );
}

export function ExploreMap() {
  return (
    <div style={{ padding: "100px 64px 80px 64px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2
            style={{
              fontFamily: "var(--font-landing-heading), sans-serif",
              fontWeight: 700,
              fontSize: 26,
              color: "var(--landing-ink)",
              margin: "0 0 8px 0",
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
            }}
          >
            Explore on the map
          </h2>
          <p style={{ fontSize: 14.5, color: "var(--landing-muted)", margin: 0 }}>Verified spaces across the Klang Valley.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {locations.map((label, i) => (
            <LocationChip key={label} label={label} active={i === 0} />
          ))}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          height: 360,
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 20px 46px rgba(14,13,16,0.1)",
        }}
      >
        <MapEmbed />
        <Button
          asChild
          className="absolute bottom-5 right-6 h-auto gap-1.5 rounded-xl px-[22px] py-3 text-[13px] font-bold"
          style={{ background: c.accent, color: "#FFFFFF", boxShadow: "0 10px 24px rgba(8,145,178,0.3)" }}
        >
          <Link href="/listings">
            Browse full map
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round">
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          </Link>
        </Button>
      </div>
    </div>
  );
}
