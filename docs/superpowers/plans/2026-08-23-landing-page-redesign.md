# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `frontend/app/page.tsx` (the marketing landing page) in the
bold/teal direction approved through design brainstorming, as a set of
small landing-only components, with zero changes to the rest of the app.

**Architecture:** One new component per page section under
`frontend/components/landing/`, composed by `frontend/app/page.tsx`. Fonts
(Unbounded, Manrope) are loaded locally in `page.tsx` via `next/font/google`
and exposed as CSS variables consumed by the landing components — the root
layout's fonts (Archivo/Work Sans) and `globals.css` tokens are untouched.
A tiny scoped `<style>` component supplies the one hover rule the design
needs, avoiding any edit to `globals.css`.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, inline
`style` objects (matching this codebase's existing convention — see
`NavBar.tsx`, `ListingCard.tsx`). No CSS framework, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-23-landing-page-redesign-design.md`

## Testing note

This repo has no frontend test framework (`package.json` only defines
`dev`/`build`/`start`/`lint` — no Jest/Vitest/Playwright). This is also a
purely presentational page with no state or business logic. Verification
per task therefore uses TypeScript's own checker and a manual visual check
via the dev server, in place of automated tests:

- **Type-check:** `cd frontend && npx tsc --noEmit`
- **Lint:** `cd frontend && npm run lint`
- **Visual check:** `cd frontend && npm run dev`, open `http://localhost:3000`

Every task's steps use these three in place of a test suite. The final
task additionally runs a production build (`npm run build`), which
type-checks more strictly than dev mode.

## Global Constraints

- **Scope:** `frontend/app/page.tsx` and new files under
  `frontend/components/landing/` only. Do not modify `globals.css`,
  `app/layout.tsx`, or `components/layout/NavBar.tsx`.
- **Colors:** literal hex values from the token table below, via the
  shared `frontend/components/landing/tokens.ts` module — not new
  `globals.css` variables.
- **Fonts:** Unbounded (weights 600/700/800) for headings, Manrope
  (weights 400–800) for body text, loaded only inside
  `frontend/app/page.tsx`.
- **No fabricated data:** do not ship specific numeric claims about
  listing counts, occupancy, or activity that aren't backed by a real
  data source. Where the approved mockup used a fabricated number
  (the hero's "116 verified spaces" stat, per-category space counts), this
  plan replaces it with real, honest copy instead — see Task 2 and Task 3.
- **No fake attribution:** the map section is a static illustration, not
  real OpenStreetMap data — do not include "Map data © OpenStreetMap
  contributors" or similar attribution text, since no OSM data is actually
  used (caught during planning; the mockup had this and shouldn't have).
- **Every internal link must go to a real, existing route:** `/listings`,
  `/listings/new`, `/login`, or an in-page anchor (`#how-it-works`). No
  links to routes that don't exist yet (e.g. no dedicated map page).
- **Accessibility floor carried over from the spec:** muted/secondary text
  uses `#6E6A76` (not the originally-tried `#9C97A0`, which fails WCAG AA
  contrast), and interactive chip/pill targets use enough padding to
  approach a ~44px tap target.

### Design tokens (for reference — defined once in Task 1)

| Token | Value |
|---|---|
| `paper` | `#FAFAFB` |
| `ink` | `#0E0D10` |
| `muted` | `#6E6A76` |
| `line` | `#E2E1E6` |
| `navLink` | `#4A4750` |
| `accent` | `#0891B2` |
| `accentSoft` | `#E1F5F9` |
| `categoryStorage` | `#0891B2` |
| `categoryGarage` | `#FF7A1E` |
| `categoryWarehouse` | `#8B5CF6` |
| `categoryContainer` | `#16A863` |
| `verified` | `#16A863` |
| `dark` | `#0E0D10` |

---

### Task 1: Landing tokens, hover styles, and the floating nav

**Files:**
- Create: `frontend/components/landing/tokens.ts`
- Create: `frontend/components/landing/LandingStyles.tsx`
- Create: `frontend/components/landing/LandingNav.tsx`
- Modify: `frontend/app/page.tsx` (replace entire file — this task
  establishes the font-loading skeleton and renders only the nav; later
  tasks add each remaining section)

**Interfaces:**
- Produces: `landingColors` (named export from `tokens.ts`) — a `const`
  object of the hex strings in the table above, typed `as const`. Every
  later task imports `{ landingColors as c } from "./tokens"`.
- Produces: `LandingStyles` (named export, no props) — renders one
  `<style>` tag defining `.landing-navlink:hover`.
- Produces: `LandingNav` (named export, no props).
- Produces (in `page.tsx`): the two CSS variable names
  `--font-landing-heading` and `--font-landing-body`, applied via
  `className` on the page's root `<div>`. Every later component's headings
  use `fontFamily: "var(--font-landing-heading), sans-serif"`; body text
  inherits `--font-landing-body` from the root div.

- [ ] **Step 1: Create the tokens file**

```ts
// frontend/components/landing/tokens.ts

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
```

- [ ] **Step 2: Create the scoped hover-style component**

```tsx
// frontend/components/landing/LandingStyles.tsx

// The one hover interaction this design needs (nav links darkening on
// hover) can't be done with inline styles alone, and this page
// deliberately doesn't touch the shared globals.css. A plain <style> tag
// works fine in a Server Component — no "use client" needed.
export function LandingStyles() {
  return (
    <style>{`
      .landing-navlink:hover { color: #0E0D10; }
    `}</style>
  );
}
```

- [ ] **Step 3: Create the floating nav component**

```tsx
// frontend/components/landing/LandingNav.tsx
import Link from "next/link";
import { landingColors as c } from "./tokens";

export function LandingNav() {
  return (
    <div
      style={{
        position: "absolute",
        top: 24,
        left: 40,
        right: 40,
        height: 68,
        background: "rgba(255,255,255,0.92)",
        borderRadius: 999,
        boxShadow: "0 10px 30px rgba(14,13,16,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px 0 26px",
        zIndex: 5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-landing-heading), sans-serif",
            fontWeight: 700,
            fontSize: 19,
            color: c.ink,
            letterSpacing: "-0.01em",
          }}
        >
          sqftex
        </Link>
        <div style={{ display: "flex", gap: 26 }}>
          <a
            href="#how-it-works"
            className="landing-navlink"
            style={{ color: c.navLink, fontWeight: 600, fontSize: 14.5 }}
          >
            How it works
          </a>
          <Link
            href="/listings/new"
            className="landing-navlink"
            style={{ color: c.navLink, fontWeight: 600, fontSize: 14.5 }}
          >
            List your space
          </Link>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link
          href="/login"
          className="landing-navlink"
          style={{ color: c.navLink, fontWeight: 600, fontSize: 14.5, padding: "0 10px" }}
        >
          Log in
        </Link>
        <Link
          href="/listings"
          style={{
            background: c.ink,
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: 14,
            padding: "12px 22px",
            borderRadius: 10,
          }}
        >
          Get started
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Replace `page.tsx` with the font-loading skeleton, rendering only the nav for now**

```tsx
// frontend/app/page.tsx
import { Unbounded, Manrope } from "next/font/google";
import { LandingStyles } from "@/components/landing/LandingStyles";
import { LandingNav } from "@/components/landing/LandingNav";
import { landingColors as c } from "@/components/landing/tokens";

const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-landing-heading",
  weight: ["600", "700", "800"],
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-landing-body",
  weight: ["400", "500", "600", "700", "800"],
});

export default function Home() {
  return (
    <div
      className={`${unbounded.variable} ${manrope.variable}`}
      style={{
        position: "relative",
        fontFamily: "var(--font-landing-body), system-ui, sans-serif",
        background: c.paper,
      }}
    >
      <LandingStyles />
      <LandingNav />
    </div>
  );
}
```

- [ ] **Step 5: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Visual check**

Run: `cd frontend && npm run dev`, open `http://localhost:3000`.
Expected: a floating white pill nav bar near the top of an otherwise blank
`#FAFAFB` page, showing "sqftex" (bold, slightly different font from the
rest of the app), "How it works", "List your space", "Log in", and a dark
"Get started" button. Hovering "How it works" / "List your space" / "Log
in" should darken the text slightly.

- [ ] **Step 7: Commit**

```bash
git add frontend/components/landing/tokens.ts frontend/components/landing/LandingStyles.tsx frontend/components/landing/LandingNav.tsx frontend/app/page.tsx
git commit -m "Add landing tokens and floating nav for landing page redesign"
```

---

### Task 2: Hero section

**Files:**
- Create: `frontend/components/landing/Hero.tsx`
- Modify: `frontend/app/page.tsx` (add `<Hero />` after `<LandingNav />`)

**Interfaces:**
- Consumes: `landingColors` from `./tokens` (Task 1).
- Produces: `Hero` (named export, no props).

**Deviation from the mockup, and why:** the approved mockup's hero right
panel showed a bold fabricated stat ("116 verified spaces open near
Petaling Jaya right now"). Per the Global Constraints' no-fabricated-data
rule, this is replaced with "No lease." plus real, already-true supporting
copy ("Book any space by the day or the month — cancel anytime") — same
visual weight, no invented number.

- [ ] **Step 1: Create the Hero component**

```tsx
// frontend/components/landing/Hero.tsx
import Link from "next/link";
import { landingColors as c } from "./tokens";

export function Hero() {
  return (
    <div style={{ padding: "208px 64px 0 64px", display: "flex", gap: 56, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 480px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            alignItems: "center",
            gap: 8,
            background: c.accentSoft,
            color: c.accent,
            fontWeight: 800,
            fontSize: 11.5,
            letterSpacing: "0.06em",
            padding: "8px 12px",
            borderRadius: 6,
            textTransform: "uppercase",
          }}
        >
          Now live &mdash; Klang Valley
        </div>
        <h1
          style={{
            fontFamily: "var(--font-landing-heading), sans-serif",
            fontWeight: 700,
            fontSize: 80,
            lineHeight: 1,
            color: c.ink,
            margin: 0,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
          }}
        >
          Spare
          <br />
          space.
          <br />
          <span style={{ color: c.accent }}>
            Sorted
            <br />
            fast.
          </span>
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: c.muted, margin: "8px 0 0 0", maxWidth: 440 }}>
          Book a storage room, garage bay or warehouse unit from a verified host near you &mdash;
          by the day or by the month, no lease required.
        </p>

        <form
          action="/listings"
          method="get"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#FFFFFF",
            border: `1px solid ${c.line}`,
            borderRadius: 12,
            padding: "8px 8px 8px 20px",
            marginTop: 14,
            maxWidth: 460,
            boxShadow: "0 10px 26px rgba(14,13,16,0.05)",
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth="1.8">
            <circle cx="12" cy="10" r="3" />
            <path d="M12 21c-4-4.5-7-8-7-11a7 7 0 0114 0c0 3-3 6.5-7 11z" />
          </svg>
          <input
            type="text"
            name="q"
            placeholder="Enter your area"
            style={{
              border: "none",
              outline: "none",
              fontFamily: "inherit",
              fontSize: 15,
              fontWeight: 500,
              color: c.ink,
              flex: 1,
              background: "transparent",
            }}
          />
          <button
            type="submit"
            style={{
              background: c.ink,
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 14,
              padding: "12px 22px",
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Search
          </button>
        </form>

        <Link href="/listings/new" style={{ fontSize: 14, color: c.muted, fontWeight: 600, marginTop: 8 }}>
          Have spare space instead?{" "}
          <span style={{ textDecoration: "underline" }}>List it and start earning &rarr;</span>
        </Link>
      </div>

      <div
        style={{
          flex: "1 1 420px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 760,
        }}
      >
        <span
          style={{
            position: "absolute",
            fontFamily: "var(--font-landing-heading), sans-serif",
            fontWeight: 700,
            fontSize: 170,
            color: "#F0F0F3",
            zIndex: 0,
            userSelect: "none",
            lineHeight: 1,
          }}
        >
          SQFT
        </span>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: 420,
            height: 460,
            borderRadius: 28,
            background: c.accent,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: 32,
            boxShadow: "0 30px 70px rgba(8,145,178,0.25)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-landing-heading), sans-serif",
              fontWeight: 700,
              fontSize: 40,
              color: "#FFFFFF",
              lineHeight: 1.1,
            }}
          >
            No lease.
          </span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#CFF0F6", marginTop: 10 }}>
            Book any space by the day or the month &mdash; cancel anytime.
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            top: 26,
            left: -10,
            zIndex: 2,
            background: c.categoryStorage,
            color: "#FFFFFF",
            fontWeight: 800,
            fontSize: 13,
            padding: "10px 16px",
            borderRadius: 10,
            boxShadow: "0 12px 26px rgba(14,13,16,0.22)",
            transform: "rotate(-8deg)",
          }}
        >
          Storage Room
        </div>
        <div
          style={{
            position: "absolute",
            top: 180,
            right: -24,
            zIndex: 2,
            background: c.categoryGarage,
            color: c.ink,
            fontWeight: 800,
            fontSize: 13,
            padding: "10px 16px",
            borderRadius: 10,
            boxShadow: "0 12px 26px rgba(14,13,16,0.18)",
            transform: "rotate(6deg)",
          }}
        >
          Garage Bay
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 16,
            zIndex: 2,
            background: c.categoryWarehouse,
            color: "#FFFFFF",
            fontWeight: 800,
            fontSize: 13,
            padding: "10px 16px",
            borderRadius: 10,
            boxShadow: "0 12px 26px rgba(14,13,16,0.18)",
            transform: "rotate(-4deg)",
          }}
        >
          Warehouse
        </div>
      </div>
    </div>
  );
}
```

Note: the three tilted category badges above use `categoryStorage`,
`categoryGarage`, `categoryWarehouse` from the shared token file — the
same colors Task 3's category tiles use. The approved mockup had these
badges using different, unreconciled colors (a flagged inconsistency in
the design spec); this implementation fixes that by using the real
category legend colors from the start.

- [ ] **Step 2: Add `<Hero />` to the page**

In `frontend/app/page.tsx`, add the import and render it after
`<LandingNav />`:

```tsx
import { Hero } from "@/components/landing/Hero";
```

```tsx
      <LandingStyles />
      <LandingNav />
      <Hero />
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Visual check**

Run: `cd frontend && npm run dev`, open `http://localhost:3000`.
Expected: below the nav, a large uppercase headline "SPARE SPACE. SORTED
FAST." (last two words teal), a search bar, and on the right a teal card
reading "No lease." with three tilted colored badges (teal, orange,
purple) around it over a faint "SQFT" watermark. Typing in the search box
and clicking "Search" should navigate to `/listings`.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/landing/Hero.tsx frontend/app/page.tsx
git commit -m "Add hero section to landing page"
```

---

### Task 3: Quick categories section

**Files:**
- Create: `frontend/components/landing/QuickCategories.tsx`
- Modify: `frontend/app/page.tsx` (add `<QuickCategories />` after `<Hero />`)

**Interfaces:**
- Consumes: `landingColors` from `./tokens`.
- Produces: `QuickCategories` (named export, no props).

**Deviation from the mockup, and why:** the mockup showed a specific
count under each category ("64 spaces", "31 spaces", etc.) and a "NEW"
badge on Container. Both are fabricated — there's no real per-category
count available without a backend query (out of scope for this pass, per
the spec's Open Items), and "NEW" doesn't mean anything meaningful before
the product has launched. Both are dropped; each tile is just an icon
and a label, linking to `/listings`.

- [ ] **Step 1: Create the QuickCategories component**

```tsx
// frontend/components/landing/QuickCategories.tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { landingColors as c } from "./tokens";

function CategoryTile({
  href,
  color,
  rotate,
  marginTop,
  label,
  children,
}: {
  href: string;
  color: string;
  rotate: string;
  marginTop: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        transform: `rotate(${rotate})`,
        marginTop,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 10px 22px ${color}4D`,
        }}
      >
        {children}
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: c.ink }}>{label}</span>
    </Link>
  );
}

export function QuickCategories() {
  return (
    <div style={{ display: "flex", gap: 34, padding: "64px 64px 0 64px", alignItems: "flex-start", flexWrap: "wrap" }}>
      <CategoryTile href="/listings" color={c.categoryStorage} rotate="-4deg" marginTop={0} label="Storage Room">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8">
          <rect x="3" y="9" width="18" height="12" rx="2" />
          <path d="M7 9V6.5A5 5 0 0117 6.5V9" />
        </svg>
      </CategoryTile>
      <CategoryTile href="/listings" color={c.categoryGarage} rotate="3deg" marginTop={10} label="Garage Bay">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8">
          <path d="M4 17h1a2 2 0 004 0h6a2 2 0 004 0h1v-5l-2-5H6L4 12z" />
          <circle cx="7.5" cy="17" r="0.6" fill="#FFFFFF" />
          <circle cx="16.5" cy="17" r="0.6" fill="#FFFFFF" />
        </svg>
      </CategoryTile>
      <CategoryTile href="/listings" color={c.categoryWarehouse} rotate="-2deg" marginTop={0} label="Warehouse">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8">
          <path d="M3 10l9-6 9 6v9a1 1 0 01-1 1H4a1 1 0 01-1-1z" />
          <path d="M9 20v-7h6v7" />
        </svg>
      </CategoryTile>
      <CategoryTile href="/listings" color={c.categoryContainer} rotate="5deg" marginTop={14} label="Container">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 11h18M9 6v13" />
        </svg>
      </CategoryTile>
    </div>
  );
}
```

- [ ] **Step 2: Add `<QuickCategories />` to the page**

```tsx
import { QuickCategories } from "@/components/landing/QuickCategories";
```

```tsx
      <Hero />
      <QuickCategories />
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Visual check**

Run: `cd frontend && npm run dev`, open `http://localhost:3000`.
Expected: below the hero, four tilted colored icon tiles (teal, orange,
purple, green) labeled Storage Room / Garage Bay / Warehouse / Container.
Clicking any tile navigates to `/listings`.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/landing/QuickCategories.tsx frontend/app/page.tsx
git commit -m "Add quick categories section to landing page"
```

---

### Task 4: Explore-on-the-map section

**Files:**
- Create: `frontend/components/landing/ExploreMap.tsx`
- Modify: `frontend/app/page.tsx` (add `<ExploreMap />` after `<QuickCategories />`)

**Interfaces:**
- Consumes: `landingColors` from `./tokens`.
- Produces: `ExploreMap` (named export, no props).

**Deviation from the mockup, and why:** dropped the "Map data ©
OpenStreetMap contributors" attribution line. The map is a static SVG
illustration styled to resemble a map — no real OpenStreetMap data is
used, so that attribution would be false. Sample price pins are kept
since they're clearly part of a decorative illustration, not a claim
about live inventory.

- [ ] **Step 1: Create the ExploreMap component**

```tsx
// frontend/components/landing/ExploreMap.tsx
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
```

- [ ] **Step 2: Add `<ExploreMap />` to the page**

```tsx
import { ExploreMap } from "@/components/landing/ExploreMap";
```

```tsx
      <QuickCategories />
      <ExploreMap />
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Visual check**

Run: `cd frontend && npm run dev`, open `http://localhost:3000`.
Expected: a "Explore on the map" heading, four location chips (Petaling
Jaya shown active/dark), and a large map-styled illustration with price
pins and a teal "Browse full map" button. All chips and the map button
navigate to `/listings`.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/landing/ExploreMap.tsx frontend/app/page.tsx
git commit -m "Add explore-on-the-map section to landing page"
```

---

### Task 5: How-it-works section

**Files:**
- Create: `frontend/components/landing/HowItWorks.tsx`
- Modify: `frontend/app/page.tsx` (add `<HowItWorks />` after `<ExploreMap />`)

**Interfaces:**
- Consumes: `landingColors` from `./tokens`.
- Produces: `HowItWorks` (named export, no props). Renders with
  `id="how-it-works"`, which is what `LandingNav`'s "How it works" link
  (Task 1) points to.

- [ ] **Step 1: Create the HowItWorks component**

```tsx
// frontend/components/landing/HowItWorks.tsx
import { landingColors as c } from "./tokens";

const steps = [
  {
    title: "1. Search nearby",
    body: "Find a verified space near you that fits what you need to store.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="1.9">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    title: "2. Book securely",
    body: "Agree on move-in with the host and pay — held in escrow until you're in.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="1.9">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 3v3M16 3v3" />
      </svg>
    ),
  },
  {
    title: "3. Move in",
    body: "Drop off your things. No lease — extend or end the booking anytime.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="1.9">
        <rect x="3" y="9" width="18" height="12" rx="2" />
        <path d="M7 9V6.5A5 5 0 0117 6.5V9" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <div id="how-it-works" style={{ padding: "100px 64px 80px 64px" }}>
      <h2
        style={{
          fontFamily: "var(--font-landing-heading), sans-serif",
          fontWeight: 700,
          fontSize: 26,
          color: c.ink,
          textAlign: "center",
          margin: "0 0 48px 0",
          textTransform: "uppercase",
          letterSpacing: "-0.01em",
        }}
      >
        How it works
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 40, maxWidth: 1080, margin: "0 auto" }}>
        {steps.map((step) => (
          <div key={step.title} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: c.accentSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {step.icon}
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: c.ink, margin: 0 }}>{step.title}</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: c.muted, margin: 0 }}>{step.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `<HowItWorks />` to the page**

```tsx
import { HowItWorks } from "@/components/landing/HowItWorks";
```

```tsx
      <ExploreMap />
      <HowItWorks />
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Visual check**

Run: `cd frontend && npm run dev`, open `http://localhost:3000`.
Expected: a centered "How it works" heading and three columns (Search
nearby / Book securely / Move in), each with a teal-tinted icon circle.
Clicking the nav's "How it works" link scrolls to this section.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/landing/HowItWorks.tsx frontend/app/page.tsx
git commit -m "Add how-it-works section to landing page"
```

---

### Task 6: Trust strip section

**Files:**
- Create: `frontend/components/landing/TrustStrip.tsx`
- Modify: `frontend/app/page.tsx` (add `<TrustStrip />` after `<HowItWorks />`)

**Interfaces:**
- Consumes: `landingColors` from `./tokens`.
- Produces: `TrustStrip` (named export, no props).

- [ ] **Step 1: Create the TrustStrip component**

```tsx
// frontend/components/landing/TrustStrip.tsx
import { landingColors as c } from "./tokens";

const items = [
  {
    label: "NRIC-verified hosts",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.verified} strokeWidth="2.2">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l2.5 2.5L16 9.5" />
      </svg>
    ),
  },
  {
    label: "Escrow-protected payments",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.verified} strokeWidth="2.2">
        <path d="M4 6h16v4H4zM6 10v8a1 1 0 001 1h10a1 1 0 001-1v-8" />
      </svg>
    ),
  },
  {
    label: "No lease, cancel anytime",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.verified} strokeWidth="2.2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
];

export function TrustStrip() {
  return (
    <div style={{ padding: "0 64px 72px 64px", display: "flex", justifyContent: "center", gap: 56, flexWrap: "wrap" }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14.5, color: "#3A3740", fontWeight: 600 }}>
          {item.icon}
          {item.label}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add `<TrustStrip />` to the page**

```tsx
import { TrustStrip } from "@/components/landing/TrustStrip";
```

```tsx
      <HowItWorks />
      <TrustStrip />
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Visual check**

Run: `cd frontend && npm run dev`, open `http://localhost:3000`.
Expected: a centered row of three short lines with green check-style
icons: "NRIC-verified hosts", "Escrow-protected payments", "No lease,
cancel anytime".

- [ ] **Step 5: Commit**

```bash
git add frontend/components/landing/TrustStrip.tsx frontend/app/page.tsx
git commit -m "Add trust strip section to landing page"
```

---

### Task 7: Host CTA band

**Files:**
- Create: `frontend/components/landing/HostBand.tsx`
- Modify: `frontend/app/page.tsx` (add `<HostBand />` after `<TrustStrip />`)

**Interfaces:**
- Consumes: `landingColors` from `./tokens`.
- Produces: `HostBand` (named export, no props).

- [ ] **Step 1: Create the HostBand component**

```tsx
// frontend/components/landing/HostBand.tsx
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
```

- [ ] **Step 2: Add `<HostBand />` to the page**

```tsx
import { HostBand } from "@/components/landing/HostBand";
```

```tsx
      <TrustStrip />
      <HostBand />
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Visual check**

Run: `cd frontend && npm run dev`, open `http://localhost:3000`.
Expected: a full-width near-black band with "HAVE SPARE SPACE?" heading,
one line of body copy, and a teal "List your space" button that navigates
to `/listings/new`.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/landing/HostBand.tsx frontend/app/page.tsx
git commit -m "Add host CTA band to landing page"
```

---

### Task 8: Footer

**Files:**
- Create: `frontend/components/landing/LandingFooter.tsx`
- Modify: `frontend/app/page.tsx` (add `<LandingFooter />` after `<HostBand />`)

**Interfaces:**
- Consumes: `landingColors` from `./tokens`.
- Produces: `LandingFooter` (named export, no props).

- [ ] **Step 1: Create the LandingFooter component**

```tsx
// frontend/components/landing/LandingFooter.tsx
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
```

- [ ] **Step 2: Add `<LandingFooter />` to the page**

```tsx
import { LandingFooter } from "@/components/landing/LandingFooter";
```

```tsx
      <HostBand />
      <LandingFooter />
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Visual check**

Run: `cd frontend && npm run dev`, open `http://localhost:3000`.
Expected: at the very bottom, "sqftex" on the left and "© 2026 sqftex ·
Malaysia" on the right.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/landing/LandingFooter.tsx frontend/app/page.tsx
git commit -m "Add footer to landing page"
```

---

### Task 9: Final verification

**Files:** none created or modified — verification only.

- [ ] **Step 1: Full type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `cd frontend && npm run lint`
Expected: no errors. (Warnings pre-existing elsewhere in the repo, if any,
are out of scope — only new warnings in the files this plan touched need
fixing.)

- [ ] **Step 3: Production build**

Run: `cd frontend && npm run build`
Expected: build succeeds. This catches type issues dev mode can miss and
confirms the two Google Fonts (`Unbounded`, `Manrope`) resolve correctly
alongside the existing `Archivo`/`Work Sans` used elsewhere in the app.

- [ ] **Step 4: Full-page visual check at desktop width**

Run: `cd frontend && npm run dev`, open `http://localhost:3000`.
Scroll through the whole page top to bottom. Expected: floating nav →
hero → quick categories → explore-on-the-map → how it works → trust strip
→ host band → footer, matching the approved design spec
(`docs/superpowers/specs/2026-08-23-landing-page-redesign-design.md`).

- [ ] **Step 5: Mobile-width visual check**

In the browser dev tools, set the viewport to ~390px wide (a common phone
width) and reload. Expected: nothing is unreadable or cut off. The hero's
two-column layout (`flexWrap: "wrap"` in Task 2) should stack vertically;
the 80px headline may need a follow-up responsive pass if it overflows —
note any specific breakage found here as a follow-up item rather than
silently leaving it broken, since none of the design-canvas mockups this
plan is based on were tested below 1440px.

- [ ] **Step 6: Confirm other pages are untouched**

Run: `git diff --stat` against the commit before Task 1 (or review the
overall diff for this plan). Expected: only files under
`frontend/components/landing/` and `frontend/app/page.tsx` changed —
`globals.css`, `app/layout.tsx`, `components/layout/NavBar.tsx`, and every
other page are untouched, per the Global Constraints.

- [ ] **Step 7: Final commit (only if any fixes were made in this task)**

```bash
git add -A
git commit -m "Fix issues found during final landing page verification"
```
