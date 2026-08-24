# Listing Wizard — Design Spec

**Date:** 2026-08-24
**Status:** Approved by user in brainstorming session, proceeding to implementation plan.
**Related:** [Listing Wizard artifact](https://claude.ai/code/artifact/4c955f5d-b49d-4387-9967-43cad909ba7c) (interactive mockup used to settle motion/layout decisions)

## Problem

`/listings/new` is currently a single long form (`ListingForm.tsx`) covering category,
title, description, size, address, price, lat/lng, rules, and one photo, submitted
and published in one shot. It works but doesn't guide a first-time host through what
each field means, has no resume-if-you-leave story, and only accepts one photo even
though the backend already supports many.

## Goal

Replace it with a six-step, full-screen wizard: **Type → Basics → Location → Pricing
→ Rules & photos → Review**. Progress is saved to the backend as a draft `Listing` as
the host goes, so leaving and coming back doesn't lose work.

## Decisions

| Area | Decision |
|---|---|
| Category branching | Same six steps for every category — category only changes copy/illustration, not which fields are asked. |
| Draft creation | `POST /listings` fires on leaving step 2 (Basics), with only category/title/description/size set. Steps 1–2 live in local React state until then. |
| Resume | The draft's id lives in the URL (`/listings/new/[draftId]?step=…`). Visiting `/listings/new` with an existing draft offers "Resume" vs "Start new." |
| Location input | Map pin picker (click/drag to place), built on `react-leaflet` like the rest of the app, with a free-text address field alongside. An optional address-search box may geocode via OSM Nominatim (free, no key) to recenter the map as a convenience; the pin itself is what's saved. |
| Photos | Multi-file upload with thumbnail grid, drag-to-reorder (`ListingPhoto.order`), and remove — the backend already supports this via repeated `POST /:id/photos/`. |
| Layout | Full-screen, split into two panes: a persistent illustration pane (left) and the step content (right). Stacks vertically under 860px. |
| Motion | Plain CSS transitions/keyframes only. No animation library (anime.js and framer-motion were both considered and explicitly rejected for this feature — see Open Questions). |
| Illustration | A cartoon box-character mascot (idle bob + blink, holds a step-specific prop icon) standing in a category-illustrated scene that fills in once a category is picked. Both react as the host progresses. |
| Extra interaction | Steps are swipeable (drag left/right), not just Continue/Back. Size and Price use custom draggable range sliders instead of plain number inputs. |

## Backend changes

### Schema migration

`Listing.priceCents`, `priceUnit`, `address`, `lat`, `lng` become nullable. A draft
created after Basics has category/title/description/sizeSqft but not the rest yet.

```prisma
model Listing {
  ...
  priceCents Int?
  priceUnit  PriceUnit?
  lat        Float?
  lng        Float?
  address    String?
  ...
}
```

Run via `npx prisma migrate dev --name nullable_listing_draft_fields`. Update
`toListingJSON` and its return type to reflect the now-optional fields, and audit
callers (public `/listings` list, `/listings/:id`) — a listing with any null in these
fields can only ever be `status: draft`, and drafts are only ever returned to their
owner (existing `findListingForRequest` / list-filter logic already restricts this),
so the public-facing shape is unaffected in practice, but the TS types must say so.

### `POST /listings` — accepts a draft-shaped payload

Relax `listingInputSchema` so `price_cents`, `price_unit`, `address`, `latitude`,
`longitude` are optional on create. `title`, `description`, `category`, `size_sqft`
stay required (these are what Basics collects). The row is created with
`status: draft` as today.

### `PATCH /listings/:id/` — unchanged

Already accepts a partial body; each wizard step after the draft exists calls this
with just its own fields.

### New: resumable-draft lookup

`GET /listings?mine=1&status=draft` — add a `mine` query param that scopes results
to `req.dbUser`'s own listings (any status), combined with the existing `status`
filter. Used by `/listings/new` on mount to check for an abandoned draft. Requires
`requireAuth` (not `attachDbUserIfPresent`) since it's meaningless without a user.

### `POST /:id/publish/` — validation extended

Currently only checks `photos.length > 0`. Add checks that `priceCents`,
`priceUnit`, `address`, `lat`, `lng` are all non-null, returning
`{ detail: "Complete all steps before publishing." }` (400) if not. This is a
safety net — the wizard's own step gating should make it unreachable in normal use.

## Frontend architecture

### Routes

- `frontend/app/listings/new/page.tsx` — steps 1 (Type) and 2 (Basics), local state
  only. On mount, calls the resumable-draft lookup; if found, shows a small
  "Resume your draft" / "Start new" choice before step 1. Leaving step 2 calls
  `createListing()` with the draft-shaped payload, then
  `router.replace(`/listings/new/${draft.id}?step=location`)`.
- `frontend/app/listings/new/[draftId]/page.tsx` — steps 3–6 (Location, Pricing,
  Rules & photos, Review). On mount, `GET`s the draft and hydrates. `?step=` in the
  URL tracks position for back-button/bookmark support. Publish button calls the
  existing `POST /:id/publish/` (now with the extended validation) and redirects to
  `/listings/[id]` on success.

Both pages render the same `<ListingWizard>` shell component, parameterized by
which steps are available and whether a draft id exists yet.

### Components (`frontend/components/listings/wizard/`)

- `WizardShell.tsx` — top progress bar, step counter, illustration pane, bottom
  Back/Continue nav, and the step-to-step transition (CSS transform/opacity,
  transition defined on `.stepwrap`, toggled via inline style — no library).
- `TypeStep.tsx`, `BasicsStep.tsx`, `LocationStep.tsx`, `PricingStep.tsx`,
  `RulesPhotosStep.tsx`, `ReviewStep.tsx` — one file each, matching the artifact's
  field layout.
- `CategoryTile.tsx` — selection state uses a short CSS keyframe pop
  (`scale(1) → scale(1.07) → scale(1)`), triggered by toggling a class.
- `RangeSlider.tsx` — reusable draggable slider (Pointer Events, CSS transition for
  snap, `transition: none` while actively dragging) used for Size and Price. Exposes
  `min`/`max`/`step`/`value`/`onChange`/`format`.
- `LocationMap.tsx` — `react-leaflet` map, click/drag-to-place marker, optional
  Nominatim address search.
- `PhotoUploader.tsx` — multi-file input, thumbnail grid, drag-to-reorder, remove.
- `WizardMascot.tsx` — the SVG box character (idle bob/blink via CSS keyframes,
  swappable held-prop emoji per step with a pop-in class) plus the category
  `SceneIllustration.tsx` it stands in front of (one SVG per category, crossfaded
  via an `active` class), and a small CSS-keyframe confetti burst on reaching the
  Review step. All assets are inline SVG built from flat shapes (rects/circles/
  lines) in the app's existing color tokens — no external image assets.

### Swipe navigation

Steps also respond to a horizontal drag on the step area (Pointer Events): the
current and adjacent step follow the finger 1:1 during the drag, then either
complete the transition or spring back based on a distance threshold, with
rubber-band resistance at step 1 and step 6. Implemented with the same
transform/opacity + CSS transition approach as button-triggered navigation — no
physics/animation library.

### Error handling

Each step's PATCH failure shows an inline error and keeps the host on that step.
A publish failure (only reachable if a step was bypassed, e.g. by editing the URL)
surfaces which step is incomplete and offers a link back to it.

## Data flow

```
/listings/new                          steps 1–2, local state only
        │  continue past Basics
        ▼
POST /listings                         category, title, description, size → draft row
        │
        ▼
/listings/new/[id]?step=location       steps 3–6, PATCH after each
        │
        ▼
POST /:id/publish                      validates every field + ≥1 photo
        │
        ▼
/listings/[id]                         live listing
```

## Testing

- Backend: migration applies cleanly against existing seed data (nullable columns
  only, no data loss); `POST /listings` accepts a draft-shaped (partial) payload and
  rejects a payload missing title/description/category/size; `GET /listings?mine=1&
  status=draft` returns only the caller's own drafts and requires auth; `POST /:id/
  publish/` now 400s when price/address/lat/lng are missing, in addition to the
  existing photo check. Follows the existing `backend/tests/*.test.ts` + supertest +
  `jest.mock("@clerk/express", …)` convention.
- Frontend: no component-testing convention exists in this repo yet (no test script
  in `frontend/package.json`), so this feature doesn't introduce one — matches
  current practice. Manual verification via `npm run dev` is the existing pattern
  for frontend changes.

## Out of scope

- Category-specific fields/branching (all categories share the same steps).
- Real Nominatim rate-limit handling / caching beyond a basic debounce — it's a
  convenience layer over manual pin placement, not load-bearing.
- Editing a *published* listing through this wizard — this spec covers creation
  only; editing an active listing keeps using whatever flow exists today.
- Mascot/scene illustrations beyond the four current categories ("Other" gets no
  dedicated scene — the mascot stands in the empty/default room).

## Open questions / risks

- **Dependency footprint**: this introduces `react-leaflet`-based map picking to
  the creation flow (already a dependency, used elsewhere) and no new animation
  library — the earlier anime.js direction was explicitly dropped in favor of
  plain CSS, so no new runtime dependency is added for motion.
- **Migration risk**: making five `Listing` columns nullable is a backward-compatible
  schema change (widening, not narrowing), but any other code path that assumes
  these are always present (e.g. serializers, other routes) needs an audit pass
  during implementation — flagged for the implementation plan to enumerate.
