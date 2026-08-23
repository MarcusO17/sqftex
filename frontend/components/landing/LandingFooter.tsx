import { landingColors as c } from "./tokens";

export function LandingFooter() {
  return (
    <div style={{ padding: "32px 64px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
      <div style={{ fontFamily: "var(--font-landing-heading), sans-serif", fontWeight: 700, fontSize: 15, color: c.ink }}>
        sqftex
      </div>
      <div style={{ fontSize: 13, color: c.muted }}>&copy; 2026 sqftex &middot; Malaysia</div>
    </div>
  );
}
