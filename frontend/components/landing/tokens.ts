// Landing-page-only design tokens. Intentionally NOT added to
// app/globals.css: the rest of the app (/login, /listings/*) still uses
// the tokens defined there. See
// docs/superpowers/specs/2026-08-23-landing-page-redesign-design.md for
// why this page is scoped separately.
export const landingColors = {
  paper: "#FAFAFB",
  ink: "#0E0D10",
  muted: "#6E6A76",
  line: "#E2E1E6",
  navLink: "#4A4750",
  accent: "#0891B2",
  accentSoft: "#E1F5F9",
  categoryStorage: "#0891B2",
  categoryGarage: "#FF7A1E",
  categoryWarehouse: "#8B5CF6",
  categoryContainer: "#16A863",
  verified: "#16A863",
  dark: "#0E0D10",
} as const;
