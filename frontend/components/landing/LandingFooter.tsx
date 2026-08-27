export function LandingFooter() {
  return (
    <div
      className="mx-auto w-full max-w-[1440px] px-6 sm:px-10 lg:px-16"
      style={{ paddingTop: 32, paddingBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}
    >
      <div style={{ fontFamily: "var(--font-landing-heading), sans-serif", fontWeight: 700, fontSize: 15, color: "var(--landing-ink)" }}>
        packrat
      </div>
      <div style={{ fontSize: 13, color: "var(--landing-muted)" }}>&copy; 2026 packrat &middot; Malaysia</div>
    </div>
  );
}
