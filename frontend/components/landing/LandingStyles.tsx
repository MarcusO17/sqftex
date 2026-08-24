// This page deliberately doesn't touch the shared globals.css (see
// tokens.ts), so its dark-mode support lives here too: CSS custom
// properties with a light default and a `prefers-color-scheme: dark`
// override, consumed by the landing components as `var(--landing-*)`
// instead of literal hex for anything that needs to flip between themes.
// Defaults to the visitor's OS/browser setting; ThemeToggle.tsx sets
// `data-theme` on <html> to let a visitor override that explicitly.
//
// Brand/category colors (teal accent, category tile colors, etc.) are
// intentionally NOT themed here — they're vivid enough to read on both a
// light and a dark page background, so they stay as literal hex in the
// components that use them.
//
// A plain <style> tag works fine in a Server Component — no "use client"
// needed for either the variables or the one hover interaction below.
export function LandingStyles() {
  return (
    <style>{`
      :root {
        --landing-paper: #FAFAFB;
        --landing-ink: #0E0D10;
        --landing-muted: #6E6A76;
        --landing-line: #E2E1E6;
        --landing-card: #FFFFFF;
        --landing-nav-bg: rgba(255,255,255,0.92);
        --landing-nav-link: #4A4750;
        --landing-ghost: #F0F0F3;
      }
      @media (prefers-color-scheme: dark) {
        :root:not([data-theme="light"]) {
          --landing-paper: #0E0D10;
          --landing-ink: #F5F3EF;
          --landing-muted: #A8A3B0;
          --landing-line: #2A2730;
          --landing-card: #17151A;
          --landing-nav-bg: rgba(23,21,26,0.92);
          --landing-nav-link: #C7C2CE;
          --landing-ghost: #1C1A20;
        }
      }
      :root[data-theme="dark"] {
        --landing-paper: #0E0D10;
        --landing-ink: #F5F3EF;
        --landing-muted: #A8A3B0;
        --landing-line: #2A2730;
        --landing-card: #17151A;
        --landing-nav-bg: rgba(23,21,26,0.92);
        --landing-nav-link: #C7C2CE;
        --landing-ghost: #1C1A20;
      }
      .landing-navlink:hover { color: var(--landing-ink); }
      .landing-theme-toggle:hover { background: var(--landing-line); }
    `}</style>
  );
}
