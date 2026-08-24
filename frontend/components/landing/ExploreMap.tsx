import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapEmbed } from "@/components/map/MapEmbed";
import { landingColors as c } from "./tokens";
import type { Listing } from "@/lib/api/listings";

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

export function ExploreMap({ listings }: { listings: Listing[] }) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 sm:px-10 lg:px-16" style={{ paddingTop: 100, paddingBottom: 80 }}>
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
          // Leaflet's internal panes (tiles/markers/tooltips/popups) use
          // z-index values up to 700 — without an explicit z-index here,
          // `position: relative` alone doesn't open a new stacking context,
          // so those panes compare directly against the rest of the page
          // (e.g. the fixed navbar's z-index: 50) and can render on top of
          // it. Giving this wrapper its own z-index traps all of Leaflet's
          // internal stacking inside it.
          zIndex: 1,
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
          height: 560,
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 20px 46px rgba(14,13,16,0.1)",
        }}
      >
        <MapEmbed listings={listings} />
        <Button
          asChild
          className="absolute bottom-5 right-6 h-auto gap-1.5 rounded-xl px-[22px] py-3 text-[13px] font-bold"
          style={{
            background: c.accent,
            color: "#FFFFFF",
            boxShadow: "0 10px 24px rgba(8,145,178,0.3)",
            // Shares the wrapper's stacking context with the Leaflet map,
            // whose panes carry explicit z-index up to 700 (popupPane).
            // Without its own z-index this button (z-index: auto) would
            // paint underneath those panes regardless of DOM order — an
            // explicit z-index above Leaflet's highest pane keeps it on top.
            zIndex: 10,
          }}
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
