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
// --landing-btn-bg/--landing-btn-text are a separate "inverse" pair for
// solid ink-colored buttons (Search, Get started, active map chips). They
// can't just reuse --landing-ink/--landing-paper: those two swap meaning
// between themes, which would turn a dark button with white text into a
// near-invisible light-on-light button once the page flips to dark mode.
//
// A plain <style> tag works fine in a Server Component — no "use client"
// needed for either the variables or the one hover interaction below.
//
// Rendered via dangerouslySetInnerHTML rather than a JSX text child: React
// HTML-escapes text children (e.g. the `"` in [data-theme="light"] becomes
// &quot;), but browsers parse <style> content as raw text and never decode
// entities inside it — so the escaped server HTML and the unescaped
// re-render React expects on hydration disagree, throwing a hydration
// mismatch. dangerouslySetInnerHTML skips React's escaping entirely, which
// is the correct/recommended way to inject raw CSS text either way.
const css = `
      :root {
        /* Unbounded/Manrope are loaded once, app-wide, in the root layout
           (app/layout.tsx) as --font-display/--font-sans — aliased here
           under their original landing-scoped names instead of loading the
           same Google Fonts a second time under a second name. */
        --font-landing-heading: var(--font-heading);
        --font-landing-body: var(--font-body);
        --landing-paper: #FAFAFB;
        --landing-ink: #0E0D10;
        --landing-muted: #6E6A76;
        --landing-line: #E2E1E6;
        --landing-card: #FFFFFF;
        --landing-nav-bg: rgba(255,255,255,0.92);
        --landing-nav-link: #4A4750;
        --landing-ghost: #F0F0F3;
        --landing-btn-bg: #0E0D10;
        --landing-btn-text: #FFFFFF;
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
          --landing-btn-bg: #F5F3EF;
          --landing-btn-text: #0E0D10;
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
        --landing-btn-bg: #F5F3EF;
        --landing-btn-text: #0E0D10;
      }
      /* Smooths the light/dark switch: ThemeToggle flips data-theme
         instantly, which snaps every --landing-* variable to its new value.
         The variable swap itself can't be animated, but the properties
         reading it can — so every element gets its own tween on the color
         channels, and the CSS-variable change animates through them for
         free. Landed on * rather than a "landing-page" wrapper class
         because most of this page's colors are literal inline
         style={{ background: "var(--landing-*)" }}, not classNames, so a
         wrapper rule wouldn't reach them. Excludes transform/rotate — those
         are hover-only affordances, not part of the theme swap, and stay
         on their own per-element transitions below (a more specific
         selector's transition shorthand fully overrides this one for that
         element, which is fine: those elements' colors are literal brand
         hex, not theme-reactive, so they have nothing here to lose).
         prefers-reduced-motion turns it off entirely. */
      *, *::before, *::after {
        transition: background-color 0.35s ease, border-color 0.35s ease, color 0.25s ease, box-shadow 0.35s ease, fill 0.35s ease, stroke 0.35s ease;
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          transition: none !important;
        }
      }
      .landing-navlink {
        transition: color 0.2s ease;
      }
      .landing-navlink:hover { color: var(--landing-ink); }
      /* LandingNav is always position: fixed (so it follows the visitor on
         scroll from the very first pixel — an absolute-positioned nav would
         scroll out of view with the rest of the document before any
         scroll-based swap to fixed could happen). This transition is what
         animates its shrink: top/width/height/padding aren't colors, so
         the universal * transition above doesn't reach them. */
      .landing-nav {
        transition: top 0.25s ease, width 0.25s ease, height 0.25s ease, padding 0.25s ease, box-shadow 0.3s ease;
      }
      .landing-theme-toggle {
        transition: background 0.2s ease, transform 0.2s ease, color 0.25s ease;
      }
      .landing-theme-toggle:hover {
        background: var(--landing-line);
        transform: rotate(14deg);
      }
      .landing-category-tile {
        transition: transform 0.25s ease;
      }
      .landing-category-tile:hover {
        animation: landing-tile-hop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }
      @keyframes landing-tile-hop {
        0% { transform: rotate(var(--tile-rotate)) translateY(0) scale(1); }
        30% { transform: rotate(calc(var(--tile-rotate) - 12deg)) translateY(-16px) scale(1.16); }
        55% { transform: rotate(calc(var(--tile-rotate) + 9deg)) translateY(-3px) scale(1.04); }
        75% { transform: rotate(calc(var(--tile-rotate) - 5deg)) translateY(-10px) scale(1.11); }
        100% { transform: rotate(var(--tile-rotate)) translateY(-6px) scale(1.08); }
      }
      /* Icon square gets its own shimmy, independent of (and layered on
         top of) the tile's rotation above, so the whole tile hops while
         the icon inside it wiggles like it's excited to be clicked. */
      .landing-category-tile:hover > div {
        animation: landing-icon-shimmy 0.55s ease-in-out;
      }
      @keyframes landing-icon-shimmy {
        0%, 100% { transform: rotate(0deg) scale(1); }
        25% { transform: rotate(-10deg) scale(1.08); }
        50% { transform: rotate(7deg) scale(0.94); }
        75% { transform: rotate(-5deg) scale(1.04); }
      }
      .landing-category-tile:hover span {
        animation: landing-label-pop 0.55s ease-in-out;
      }
      @keyframes landing-label-pop {
        0%, 100% { transform: translateY(0); }
        40% { transform: translateY(-3px); }
        70% { transform: translateY(1px); }
      }
      @media (prefers-reduced-motion: reduce) {
        .landing-category-tile:hover,
        .landing-category-tile:hover > div,
        .landing-category-tile:hover span {
          animation: none;
        }
      }
    `;

export function LandingStyles() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
