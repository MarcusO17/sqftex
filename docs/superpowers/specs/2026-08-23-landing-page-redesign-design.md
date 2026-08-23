# Landing page redesign — design spec

Date: 2026-08-23
Scope: `frontend/app/page.tsx` (marketing landing page) only.

## Background

The current landing page uses the original neo-brutalist system (thick 3px
ink borders, 2px corners, Archivo Black + Work Sans, green/orange palette
defined in `globals.css`). That system is also shared, via `:root` CSS
variables and utility classes (`.chip`, `.btn-primary`, `.field`, `.seg`)
and the `NavBar` component, with `/login`, `/listings`, `/listings/[id]`,
and `/listings/new`.

Through an extended visual brainstorm (mockups iterated live, not
reproduced here), we landed on a new direction for the landing page:
a bold, asymmetric "poster" style, light mode, built around one electric
accent color, replacing the previous soft neo-brutalist and several other
explored directions (warm/kraft, dark mode, multiple font pairings). The
full option space that was explored and rejected is listed at the end of
this doc for the record; only the approved direction is specced below.

## Scope decision: landing-page-only, no shared-token changes

**Decision:** This pass does not touch `globals.css`, root `layout.tsx`
font loading, or the shared `NavBar` component. It ships new,
landing-page-local components and loads its own fonts directly in the
landing page's component tree.

**Why:** `globals.css`'s `:root` tokens and `NavBar` are shared with
`/login` and `/listings/*`, none of which have been redesigned in this
direction. Changing shared tokens would immediately change the look of
every other page before anyone has reviewed that. Scoping to the landing
page keeps this change reversible and low-risk, at the cost of a visible
style inconsistency between `/` and the rest of the app until those pages
get their own redesign pass (tracked as follow-up, not this pass).

**Practical implications:**
- New fonts (Unbounded, Manrope) are loaded via `next/font/google` inside
  `frontend/app/page.tsx` (or a small landing-only layout wrapper), not in
  the root `layout.tsx`.
- A new landing-only nav component replaces `<NavBar variant="guest" />`
  for this page. `NavBar` itself is untouched; `/login` keeps using it
  unchanged.
- Colors are applied as literal hex values (inline `style`, matching this
  codebase's existing convention — see `NavBar.tsx`, `ListingCard.tsx`),
  not new `:root` variables. If/when the rest of the app is redesigned to
  match, promoting these to shared tokens is a natural follow-up.

## Design tokens (landing page scope)

| Token | Value | Use |
|---|---|---|
| Page background | `#FAFAFB` | Body background — neutral cool off-white, deliberately not warm/cream (see rejected directions) |
| Ink (primary text) | `#0E0D10` | Headlines, primary text, dark UI |
| Muted text | `#6E6A76` | Secondary text/captions. Chosen over the originally-tried `#9C97A0` (~2.9:1 contrast, fails WCAG AA) — `#6E6A76` measures ~5:1 against the page background |
| Line/border | `#E2E1E6` | Card borders, dividers |
| Accent (Teal) | `#0891B2` | Primary accent — CTAs, links, active states, one category tile |
| Accent soft | `#E1F5F9` | Accent-tinted badge backgrounds |
| Category — Garage Bay | `#FF7A1E` | |
| Category — Warehouse | `#8B5CF6` | |
| Category — Container | `#16A863` | Same hex reused for the verified-checkmark green (semantic green, not category-exclusive) |
| Sticker accent | `#C6FF3D` lime | The "Garage Bay" tilted sticker badge in the hero collage only |
| "NEW" tag accent | `#FF3D8F` magenta | Small tilted badge on the Container category tile (Quick Categories section) only |
| Dark contrast block | `#0E0D10` | Host CTA band background (the one deliberate dark section on an otherwise light page) |

**Fonts:** Unbounded (weights 600/700/800) for display/headings, Manrope
(weights 400–800) for body and UI text. Both via Google Fonts.
Rationale: this pairing was chosen over Bricolage Grotesque + Instrument
Sans (the first bold-direction pairing) specifically for this build —
see rejected options.

**Shape language:** Mostly squared-rounded corners (9–14px) for cards,
buttons, and badges — not the previous system's 2px sharp corners, and
not full pills except one place: the floating nav bar container itself
(999px radius). Everything inside that nav bar — including the "Get
started" button — uses the same 9–10px radius as the rest of the page.
Tap targets for interactive chips/pills are sized to ~40–44px (padding
bumped during review to meet this — see Accessibility notes).

**Layout language:** Deliberately asymmetric, not the centered/soft
composition explored earlier — oversized uppercase headline, tilted
"sticker" badges (rotated -8° to +12°) scattered over a solid-color stat
block, an oversized ghosted wordmark ("SQFT") as background texture, and
a floating pill nav that visually overlaps the hero content beneath it.

## Page structure (top to bottom)

1. **Floating nav** — absolutely positioned pill bar, 24px inset from top
   and sides, `rgba(255,255,255,0.92)` background, soft shadow. Wordmark
   ("sqftex", Unbounded 700), "How it works" / "List your space" links,
   "Log in" text link, "Get started" solid-teal button.
2. **Hero** — eyebrow badge ("Now live — Klang Valley"), oversized
   headline ("Spare space. Sorted fast." — short/punchy copy, a
   deliberate departure from the longer descriptive headline used in
   earlier directions), descriptive subhead, search input + button, "have
   spare space instead?" secondary link. Right side: a teal stat block
   ("116 verified spaces open near Petaling Jaya right now" — **illustrative
   placeholder**, not wired to real data) with three tilted category
   sticker badges, over a ghosted "SQFT" wordmark.
3. **Quick categories** — four color-coded icon tiles (Storage Room/teal,
   Garage Bay/orange, Warehouse/purple, Container/green), scattered at
   slight rotations, each with a live-feeling space count (**illustrative
   placeholder numbers** — see Open items). Container tile carries a
   small "NEW" badge.
4. **Explore on the map** — heading + location quick-pick chips
   (Petaling Jaya active by default) + a large OSM-styled map illustration
   with price-tag pins and a "Browse full map" CTA. **This is a static
   SVG illustration styled to look like an OpenStreetMap embed, not a
   live map** — see Open items for what a real implementation needs.
5. **How it works** — 3-step explainer (Search nearby / Book securely /
   Move in), icon + heading + one-line body each.
6. **Trust strip** — three policy statements (NRIC-verified hosts,
   escrow-protected payments, no lease/cancel anytime). Deliberately
   *not* numeric social-proof claims ("500+ hosts", "4.9★") since the
   product hasn't launched — those would be fabricated.
7. **Host band** — full-width dark (`#0E0D10`) contrast block, "Have
   spare space?" + one line of copy + "List your space" teal CTA button.
   This is the one deliberate dark section on the page.
8. **Footer** — wordmark + copyright line.

(A "what could you get" Renter/Host earnings-and-cost calculator with a
live bar chart was prototyped and explicitly removed from this design at
the user's request. It's a legitimate follow-on feature idea — see Open
items — but is out of scope for this landing page pass.)

## Accessibility notes already applied in the mockup

- Muted secondary text color changed from `#9C97A0` (~2.9:1 contrast on
  the page background, fails WCAG AA) to `#6E6A76` (~5:1, passes).
- Interactive pill/chip controls (location chips, any future filter
  chips) sized with enough padding to approach the ~44px recommended tap
  target, up from an initial ~32–34px.
- Link color/hover states are defined explicitly (required so a Google
  Fonts-based page doesn't fall back to default blue links).

These should carry through to the real implementation, not just the
mockup.

## Open items — decisions needed before/during implementation

1. **Quick-category counts** ("64 spaces", "31 spaces", etc.) are
   hardcoded illustrative numbers in the mockup. Real implementation
   needs either: (a) a real count per category from the listings API, or
   (b) drop the count line entirely for launch and add it once that data
   is cheap to query. Not decided — flag for the implementation plan.
2. **Hero stat block** ("116 verified spaces...") is fully fabricated for
   the mockup. Same choice as above applies — real count, or reword to
   avoid a specific unverified number until launch.
3. **Map section** ships as a static styled illustration for this pass.
   A live location search (real OpenStreetMap/Leaflet embed, or another
   map provider) is a separate, larger scope — the `/listings` browse
   page doesn't have a map implementation yet either. The "Browse full
   map" CTA should link to `/listings` as it exists today, not to a map
   view that doesn't exist yet.
4. **Renter/Host calculator**: prototyped as a real interactive
   component (working toggle/pills/bar chart, no external chart library —
   canvas mockups can't load Chart.js) using illustrative RM/sqft rates
   and a made-up 85%-occupancy assumption for host earnings, with no real
   commission rate baked in (none exists yet in the business rules docs
   available to me). Removed from this design at the user's request. If
   revisited later: needs real category rate data and, for the host side,
   an actual commission percentage from product/business — not something
   to invent client-side.
5. **Hero sticker colors don't match the category-tile color legend.** The
   hero's tilted "Garage Bay" sticker is lime and "Warehouse" is orange,
   but the Quick Categories section (the actual color-coded legend) uses
   orange for Garage Bay and purple for Warehouse. This wasn't a
   deliberate choice — the hero stickers were designed before the
   category legend existed and were never reconciled. Worth aligning the
   hero stickers to the real category colors during implementation unless
   there's a reason to keep them decorative/arbitrary.
6. **Follow-up phases** (not this pass): bring `/login`, `/listings`,
   `/listings/[id]`, `/listings/new`, and the host-facing screens in line
   with this direction; at that point the landing-page-local tokens
   listed above are good candidates to promote into `globals.css`
   `:root` variables shared app-wide.

## Rejected / explored-and-parked directions

For the record, kept brief since these were explored live and aren't
being built:

- **Direction A ("Clean Slate")** — Baloo 2 + Plus Jakarta Sans, fully
  rounded (20px), warm amber/kraft accent tying to the storage-box
  category. Explored across renter browse, listing detail, and a host
  dashboard panel.
- **Direction B ("Keep the Wordmark")** — kept Archivo for the wordmark,
  Work Sans body, terracotta accent, softened but less-rounded corners
  (10–14px). Same three screens as Direction A.
- Both directions were then pushed through several rounds of iteration
  (floating nav, more breathing room, a brighter tangerine palette, a
  "messy"/Grab-icon-grid-inspired category treatment, added map/location
  utility) before the user judged the whole warm/amber direction "too
  much like Claude's own palette" and asked for something bolder — which
  led to the dark-mode "Bricolage Grotesque + Unbounded-adjacent"
  exploration and eventually today's approved direction.
- **Dark-mode bold hero** (Bricolage Grotesque + Instrument Sans, near-
  black background, electric blue accent) — approved as a direction in
  principle, then the user asked to see it in light mode first, which
  became the basis for what's specced above. The dark variant is kept as
  a reference mockup but is not what's being implemented.
- **12 accent-color options** were tried across three comparison rounds
  (Electric Blue, Acid Lime, Hot Magenta, Ember, Violet, Teal, Crimson,
  Forest, Gold, Steel, Coral, Ochre) before Teal was picked.
- **4 font pairings** were compared for the bold direction (Bricolage
  Grotesque + Instrument Sans, Unbounded + Manrope, Syne + Work Sans, Big
  Shoulders Display + Karla) before Unbounded + Manrope was picked.

## Testing / verification notes for implementation

- No backend or business-logic changes in this pass — purely a marketing
  page rebuild. `python manage.py test` should be unaffected.
- Visual check at desktop width is the main verification; the mockup was
  only built at 1440px — a mobile/responsive pass is needed during
  implementation since none of the mockups were tested at phone width
  (flagged here since this codebase's own conventions call for that
  check, and the design-canvas mockups didn't include it).
- Confirm the new Google Fonts (`Unbounded`, `Manrope`) load correctly
  alongside the existing `Archivo`/`Work Sans` used elsewhere in the app
  without conflicting.
