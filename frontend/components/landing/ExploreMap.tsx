import Link from "next/link";
import { landingColors as c } from "./tokens";

const locations = ["Petaling Jaya", "Subang Jaya", "Shah Alam", "Cheras"];

function LocationChip({ label, active }: { label: string; active: boolean }) {
  return (
    <Link
      href="/listings"
      style={{
        border: `1px solid ${active ? c.ink : c.line}`,
        color: active ? "#FFFFFF" : c.muted,
        background: active ? c.ink : "transparent",
        fontWeight: 700,
        fontSize: 12.5,
        padding: "12px 16px",
        borderRadius: 8,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Link>
  );
}

function MapPin({ left, top, label, primary }: { left: number; top: number; label: string; primary?: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: primary ? 2 : 1,
      }}
    >
      <div
        style={{
          background: primary ? c.ink : "#FFFFFF",
          color: primary ? "#FFFFFF" : c.ink,
          fontWeight: primary ? 800 : 700,
          fontSize: primary ? 13 : 12,
          padding: primary ? "8px 13px" : "7px 12px",
          borderRadius: 999,
          boxShadow: primary ? "0 4px 12px rgba(14,13,16,0.3)" : "0 3px 10px rgba(14,13,16,0.14)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: primary ? 9 : 8,
          height: primary ? 9 : 8,
          background: primary ? c.ink : "#FFFFFF",
          transform: "rotate(45deg)",
          marginTop: -4,
        }}
      />
    </div>
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
              color: c.ink,
              margin: "0 0 8px 0",
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
            }}
          >
            Explore on the map
          </h2>
          <p style={{ fontSize: 14.5, color: c.muted, margin: 0 }}>Verified spaces across the Klang Valley.</p>
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
        <svg width="100%" height="100%" viewBox="0 0 1312 360" preserveAspectRatio="none" style={{ display: "block" }}>
          <rect width="1312" height="360" fill="#EEEEF1" />
          <path d="M-40 250 C 220 190, 420 290, 640 230 S 1100 170, 1360 210" stroke="#E1E6EF" strokeWidth="70" fill="none" />
          <rect x="920" y="-30" width="260" height="220" fill="#E4EEF6" />
          <path d="M0 70 H1312" stroke="#FFFFFF" strokeWidth="10" />
          <path d="M0 290 H1312" stroke="#FFFFFF" strokeWidth="9" />
          <path d="M260 0 V360" stroke="#FFFFFF" strokeWidth="9" />
          <path d="M760 0 V360" stroke="#FFFFFF" strokeWidth="12" />
          <path d="M-40 340 L 1360 30" stroke="#FFFFFF" strokeWidth="16" />
          <path d="M0 170 H1312" stroke="#FFFFFF" strokeWidth="5" />
        </svg>
        <MapPin left={300} top={150} label="RM 180" primary />
        <MapPin left={480} top={230} label="RM 250" />
        <MapPin left={150} top={90} label="RM 150" />
        <MapPin left={660} top={110} label="RM 420" />
        <MapPin left={850} top={260} label="RM 300" />
        <Link
          href="/listings"
          style={{
            position: "absolute",
            bottom: 20,
            right: 24,
            background: c.accent,
            fontSize: 13,
            fontWeight: 700,
            color: "#FFFFFF",
            padding: "12px 22px",
            borderRadius: 12,
            boxShadow: "0 10px 24px rgba(8,145,178,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Browse full map
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round">
            <path d="M7 17L17 7M7 7h10v10" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
