# Listing Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-page `/listings/new` form with a six-step, full-screen wizard (Type → Basics → Location → Pricing → Rules & photos → Review) that saves a draft to the backend as the host progresses and can be resumed.

**Architecture:** Steps 1–2 run client-side only (no draft yet); leaving Basics creates a draft `Listing` (`status: draft`) via `POST /listings`; steps 3–6 live at `/listings/new/[draftId]` and `PATCH` the draft after each step; Review calls the existing `/publish` endpoint (now with stricter validation). A persistent illustration pane (SVG mascot + category scene) sits beside the step content; all motion is plain CSS (keyframes/transitions), no animation library.

**Tech Stack:** Express + TypeScript + Prisma (backend), Next.js App Router + TypeScript + react-leaflet (frontend). No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-08-24-listing-wizard-design.md`

## Global Constraints

- Money stays integer cents; sizes/prices in the UI are RM/sqft, converted at the API boundary (existing `ListingForm.tsx` pattern: `Math.round(rm * 100)`).
- API JSON is snake_case; Prisma fields are camelCase — never spread one into the other directly (see the existing `mapCreateFields`/`mapUpdateFields` comment in `backend/src/routes/listings.ts`).
- No animation library (framer-motion is an existing dependency but is **not** used by this feature; anime.js is explicitly rejected — see spec's Open Questions). All motion is CSS keyframes/transitions.
- Frontend has no test runner configured (`frontend/package.json` has no `test` script). Frontend tasks verify with `npx tsc --noEmit` (must be zero errors) run from `frontend/`, matching current project practice — do not add a new test framework as part of this feature.
- Backend tasks follow the existing `backend/tests/**/*.test.ts` convention: real Postgres via `prisma` client (not mocked), `jest.mock("@clerk/express", …)` for auth, test rows tagged with a `test_<feature>_` prefix on `clerkUserId` and cleaned up in `afterEach`.
- Every new/modified backend route file keeps the trailing-slash route style already used throughout `listings.ts` (`"/:id/publish/"`, not `"/:id/publish"`).

---

## Task 1: Make draft-only Listing fields nullable

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Test: `backend/tests/serializers/listing.test.ts`

**Interfaces:**
- Produces: `Listing.priceCents: number | null`, `priceUnit: PriceUnit | null`, `lat: number | null`, `lng: number | null`, `address: string | null` (Prisma-generated type, consumed by every later backend task).

- [ ] **Step 1: Update the schema**

In `backend/prisma/schema.prisma`, change the `Listing` model:

```prisma
model Listing {
  id              Int      @id @default(autoincrement())
  ownerId         Int
  owner           User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  title           String
  description     String
  category        ListingCategory
  sizeSqft        Int
  priceCents      Int?
  priceUnit       PriceUnit?
  lat             Float?
  lng             Float?
  address         String?
  accessRules     String   @default("")
  prohibitedItems String   @default("")
  status          ListingStatus @default(draft)
  photos          ListingPhoto[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

(Only `priceCents`, `priceUnit`, `lat`, `lng`, `address` gain the `?`.)

- [ ] **Step 2: Generate and apply the migration**

Run: `cd backend && npx prisma migrate dev --name nullable_listing_draft_fields`

Expected: a new folder under `backend/prisma/migrations/` containing an `ALTER TABLE "Listing" ALTER COLUMN ... DROP NOT NULL` for each of the five columns, applied cleanly (widening nullable is backward-compatible — no data loss, no manual SQL needed).

- [ ] **Step 3: Update the serializer test to cover a draft (nulls) row — write the failing test**

Add to `backend/tests/serializers/listing.test.ts`, after the existing `describe("toListingJSON", ...)` block:

```typescript
describe("toListingJSON with a draft (unset) listing", () => {
  it("passes through nulls for fields the wizard hasn't collected yet", () => {
    const draft: Listing = {
      ...baseListing,
      priceCents: null,
      priceUnit: null,
      lat: null,
      lng: null,
      address: null,
      status: "draft",
    };
    const json = toListingJSON({ ...draft, photos: [] });
    expect(json.price_cents).toBeNull();
    expect(json.price_unit).toBeNull();
    expect(json.location_lat).toBeNull();
    expect(json.location_lng).toBeNull();
    expect(json.address).toBeNull();
  });
});
```

- [ ] **Step 4: Run it, confirm it fails to compile**

Run: `cd backend && npx tsc --noEmit`
Expected: FAIL — `Type 'null' is not assignable to type 'number'` (etc.) on `priceCents: null` and friends, because `ListingJSON`/`Listing` (Prisma type) don't allow null yet until Task 3 updates the serializer's output type. This is expected here — Task 3 fixes the serializer; this task only touches the schema. Skip straight to Step 5 (the schema/migration change itself, Steps 1–2, is what this task delivers) and leave the new test red until Task 3 lands.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations backend/tests/serializers/listing.test.ts
git commit -m "feat(backend): make draft-only Listing fields nullable

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Update the serializer for nullable fields

**Files:**
- Modify: `backend/src/serializers/listing.ts`
- Test: `backend/tests/serializers/listing.test.ts` (already extended in Task 1)

**Interfaces:**
- Consumes: `Listing` Prisma type with nullable `priceCents`/`priceUnit`/`lat`/`lng`/`address` (Task 1).
- Produces: `ListingJSON` with `price_cents: number | null`, `price_unit: string | null`, `location_lat: number | null`, `location_lng: number | null`, `address: string | null` — consumed by Task 4 (publish validation) and the frontend's `Listing` type (Task 6).

- [ ] **Step 1: Run the test from Task 1 to confirm it still fails**

Run: `cd backend && npx tsc --noEmit`
Expected: same type errors as Task 1 Step 4.

- [ ] **Step 2: Update `ListingJSON` and `toListingJSON`**

In `backend/src/serializers/listing.ts`:

```typescript
export interface ListingJSON {
  id: number;
  owner: number;
  title: string;
  description: string;
  category: string;
  size_sqft: number;
  price_cents: number | null;
  price_unit: string | null;
  address: string | null;
  access_rules: string;
  prohibited_items: string;
  status: string;
  photos: ListingPhotoJSON[];
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  updated_at: string;
}
```

The body of `toListingJSON` is unchanged (it already just passes these fields through — `null` flows through a straight assignment fine).

- [ ] **Step 3: Run tests, confirm they pass**

Run: `cd backend && npx tsc --noEmit && npm test -- listing.test.ts`
Expected: PASS, no type errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/serializers/listing.ts
git commit -m "feat(backend): serializer passes through nullable draft fields

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: `POST /listings` accepts a draft-shaped payload

**Files:**
- Modify: `backend/src/routes/listings.ts`
- Test: `backend/tests/routes/listings.test.ts`

**Interfaces:**
- Consumes: nullable `Listing` fields (Task 1).
- Produces: `POST /api/v1/listings/` now succeeds with just `{ title, description, category, size_sqft }` — consumed by the frontend's `createListing()` (Task 6).

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/routes/listings.test.ts`, inside the `describe("listings routes", ...)` block (after the existing `"POST / creates a listing for a verified user"` test):

```typescript
  it("POST / creates a draft with only category/title/description/size, rest null", async () => {
    await makeUser("test_listings_draft", "draft@example.com", true);
    authAs("test_listings_draft", "draft@example.com");

    const res = await request(await createApp()).post("/api/v1/listings/").send({
      title: "Spare Room",
      description: "Nice and dry.",
      category: "spare_room",
      size_sqft: 120,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "Spare Room",
      category: "spare_room",
      size_sqft: 120,
      status: "draft",
      price_cents: null,
      price_unit: null,
      address: null,
      location_lat: null,
      location_lng: null,
    });
  });
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `cd backend && npm test -- listings.test.ts`
Expected: FAIL — 400 response, because `listingInputSchema` still requires `price_cents`/`price_unit`/`address`/`latitude`/`longitude`.

- [ ] **Step 3: Relax the input schema and field mapping**

In `backend/src/routes/listings.ts`, change `listingInputSchema`:

```typescript
const listingInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.nativeEnum(ListingCategory),
  size_sqft: z.number().int().positive(),
  price_cents: z.number().int().positive().optional(),
  price_unit: z.nativeEnum(PriceUnit).optional(),
  address: z.string().min(1).optional(),
  access_rules: z.string().optional().default(""),
  prohibited_items: z.string().optional().default(""),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
```

Then update `mapCreateFields` (the field mapper already separates renamed fields from the rest — it just needs to stop assuming they're always present):

```typescript
function mapCreateFields(input: z.infer<typeof listingInputSchema>) {
  const { size_sqft, price_cents, price_unit, access_rules, prohibited_items, latitude, longitude, ...rest } = input;
  return {
    ...rest,
    sizeSqft: size_sqft,
    priceCents: price_cents ?? null,
    priceUnit: price_unit ?? null,
    accessRules: access_rules,
    prohibitedItems: prohibited_items,
    lat: latitude ?? null,
    lng: longitude ?? null,
  };
}
```

`mapUpdateFields` is unchanged — it already only sets a field when the caller provided it, which is exactly what a `PATCH` from a later wizard step needs.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `cd backend && npm test -- listings.test.ts`
Expected: PASS, including the pre-existing `"POST / creates a listing for a verified user"` test (full payload still works — every field is still accepted, just no longer required).

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/listings.ts backend/tests/routes/listings.test.ts
git commit -m "feat(backend): POST /listings accepts a draft-shaped payload

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: `GET /listings?mine=1&status=draft` for resumable drafts

**Files:**
- Modify: `backend/src/routes/listings.ts`
- Test: `backend/tests/routes/listings.test.ts`

**Interfaces:**
- Produces: `GET /api/v1/listings/?mine=1&status=draft` returns only the caller's own listings, filtered by status when given — consumed by the frontend's `listMyDraftListings()` (Task 6).

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/routes/listings.test.ts`:

```typescript
  it("GET /?mine=1&status=draft returns only the caller's own drafts", async () => {
    const owner = await makeUser("test_listings_mine", "mine@example.com", true);
    const other = await makeUser("test_listings_mine_other", "mine_other@example.com", true);
    await prisma.listing.create({
      data: { ...dbFields, sizeSqft: 120, category: "spare_room", status: "draft", ownerId: owner.id, title: "My Draft" },
    });
    await prisma.listing.create({
      data: { ...dbFields, sizeSqft: 120, priceCents: 15000, priceUnit: "monthly", category: "spare_room", status: "active", lat: 1, lng: 1, ownerId: owner.id, title: "My Active" },
    });
    await prisma.listing.create({
      data: { ...dbFields, sizeSqft: 120, category: "spare_room", status: "draft", ownerId: other.id, title: "Someone Else's Draft" },
    });

    authAs("test_listings_mine", "mine@example.com");
    const res = await request(await createApp()).get("/api/v1/listings/?mine=1&status=draft");
    expect(res.status).toBe(200);
    const titles = res.body.map((l: any) => l.title);
    expect(titles).toEqual(["My Draft"]);
  });

  it("GET /?mine=1 requires auth", async () => {
    anon();
    const res = await request(await createApp()).get("/api/v1/listings/?mine=1");
    expect(res.status).toBe(401);
  });
```

Note: `dbFields` (the shared fixture at the top of the file) sets `address`, which is now optional — this test's `prisma.listing.create()` calls skip `priceCents`/`priceUnit`/`lat`/`lng` for the draft rows since those are direct Prisma calls, not through the route, and Task 1 already made them nullable at the DB level.

- [ ] **Step 2: Run it, confirm it fails**

Run: `cd backend && npm test -- listings.test.ts`
Expected: FAIL — `mine=1` is currently ignored, so the first test sees all three listings' worth of titles (or errors), and the second test gets `200` instead of `401` (the existing `GET /` route uses `attachDbUserIfPresent`, which doesn't reject anonymous callers).

- [ ] **Step 3: Implement**

In `backend/src/routes/listings.ts`, replace the `listingsRouter.get("/", ...)` handler:

```typescript
listingsRouter.get("/", attachDbUserIfPresent, async (req, res) => {
  const mine = req.query.mine === "1";
  if (mine && !req.dbUser) {
    res.status(401).json({ detail: "Authentication required." });
    return;
  }

  const statusParam = typeof req.query.status === "string" ? req.query.status : undefined;
  const where = mine
    ? { ownerId: req.dbUser!.id, ...(statusParam ? { status: statusParam as ListingStatus } : {}) }
    : req.dbUser
      ? { OR: [{ status: ListingStatus.active }, { ownerId: req.dbUser.id }] }
      : { status: ListingStatus.active };

  const listings = await prisma.listing.findMany({
    where,
    include: { photos: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(listings.map(toListingJSON));
});
```

- [ ] **Step 4: Run tests, confirm they pass**

Run: `cd backend && npm test -- listings.test.ts`
Expected: PASS, including the pre-existing `"GET / returns only active listings for an anonymous caller"` test (that path is unchanged — `mine` defaults to falsy).

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/listings.ts backend/tests/routes/listings.test.ts
git commit -m "feat(backend): add mine/status filters to GET /listings for resumable drafts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: `POST /:id/publish/` validates every required field, not just photos

**Files:**
- Modify: `backend/src/routes/listings.ts`
- Test: `backend/tests/routes/listings-photos-publish.test.ts`

**Interfaces:**
- Produces: publish now 400s with `{ detail: "Complete all steps before publishing." }` if `priceCents`/`priceUnit`/`address`/`lat`/`lng` are null, in addition to the existing photo check.

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/routes/listings-photos-publish.test.ts` (needs its own draft-maker since the existing `makeDraftListing` always fills every field — add a second helper rather than adding an optional-fields parameter to the existing one, since every current caller wants the fully-filled draft):

```typescript
async function makeIncompleteDraftListing(ownerId: number) {
  return prisma.listing.create({
    data: { title: "Spare Room", description: "x", category: "spare_room", sizeSqft: 100, status: "draft", ownerId },
  });
}
```

```typescript
  it("POST /:id/publish/ rejects a draft missing price/address/location even with a photo", async () => {
    const owner = await makeUser("test_pub_5", "pub5@example.com");
    const listing = await makeIncompleteDraftListing(owner.id);
    authAs("test_pub_5", "pub5@example.com");

    await request(await createApp())
      .post(`/api/v1/listings/${listing.id}/photos/`)
      .attach("image", Buffer.from("fake"), "cover.jpg");

    const res = await request(await createApp()).post(`/api/v1/listings/${listing.id}/publish/`);
    expect(res.status).toBe(400);
    expect(res.body.detail).toBe("Complete all steps before publishing.");
  });
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `cd backend && npm test -- listings-photos-publish.test.ts`
Expected: FAIL — currently returns `200` since the handler only checks `photos.length`.

- [ ] **Step 3: Implement**

In `backend/src/routes/listings.ts`, update the `POST /:id/publish/` handler:

```typescript
listingsRouter.post("/:id/publish/", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const listing = await prisma.listing.findUnique({ where: { id }, include: { photos: true } });
  if (!listing || listing.ownerId !== req.dbUser!.id) {
    res.status(404).json({ detail: "Not found." });
    return;
  }
  if (listing.photos.length === 0) {
    res.status(400).json({ detail: "Add at least one photo before publishing." });
    return;
  }
  const missingField =
    listing.priceCents === null ||
    listing.priceUnit === null ||
    listing.address === null ||
    listing.lat === null ||
    listing.lng === null;
  if (missingField) {
    res.status(400).json({ detail: "Complete all steps before publishing." });
    return;
  }
  const updated = await prisma.listing.update({
    where: { id },
    data: { status: ListingStatus.active },
    include: { photos: true },
  });
  res.json(toListingJSON(updated));
});
```

- [ ] **Step 4: Run tests, confirm they pass**

Run: `cd backend && npm test -- listings-photos-publish.test.ts`
Expected: PASS, including the pre-existing `"POST /:id/photos/ then POST /:id/publish/ activates the listing"` test (that draft is fully filled via the original `makeDraftListing`, so the new check passes through).

- [ ] **Step 5: Run the full backend suite**

Run: `cd backend && npm test`
Expected: PASS, all files.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/listings.ts backend/tests/routes/listings-photos-publish.test.ts
git commit -m "feat(backend): publish validates price/address/location, not just photos

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Frontend API client — nullable types, draft helpers

**Files:**
- Modify: `frontend/lib/api/listings.ts`

**Interfaces:**
- Consumes: backend changes from Tasks 3–5.
- Produces: `Listing` type with nullable `price_cents`/`price_unit`/`address`/`location_lat`/`location_lng`; `CreateListingInput` with those same fields now optional; `updateListing(id, input, token)`; `listMyDraftListings(token)`. Consumed by every wizard component task (7–15).

- [ ] **Step 1: Update types and add the new functions**

Replace the contents of `frontend/lib/api/listings.ts`:

```typescript
import { apiFetch } from "./client";

export interface ListingPhoto {
  id: number;
  image: string;
  order: number;
}

export interface Listing {
  id: number;
  owner: number;
  title: string;
  description: string;
  category: string;
  size_sqft: number;
  price_cents: number | null;
  price_unit: "daily" | "monthly" | null;
  address: string | null;
  access_rules: string;
  prohibited_items: string;
  status: "draft" | "active";
  photos: ListingPhoto[];
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateListingInput {
  title: string;
  description: string;
  category: string;
  size_sqft: number;
  price_cents?: number;
  price_unit?: "daily" | "monthly";
  address?: string;
  access_rules?: string;
  prohibited_items?: string;
  latitude?: number;
  longitude?: number;
}

export async function listListings(token?: string | null): Promise<Listing[]> {
  return apiFetch<Listing[]>("/api/v1/listings/", {}, token);
}

export async function listMyDraftListings(token: string): Promise<Listing[]> {
  return apiFetch<Listing[]>("/api/v1/listings/?mine=1&status=draft", {}, token);
}

export async function getListing(id: number, token?: string | null): Promise<Listing> {
  return apiFetch<Listing>(`/api/v1/listings/${id}/`, {}, token);
}

export async function createListing(input: CreateListingInput, token: string): Promise<Listing> {
  return apiFetch<Listing>(
    "/api/v1/listings/",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
    token
  );
}

export async function updateListing(
  id: number,
  input: Partial<CreateListingInput>,
  token: string
): Promise<Listing> {
  return apiFetch<Listing>(
    `/api/v1/listings/${id}/`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
    token
  );
}

export async function addListingPhoto(listingId: number, file: File, token: string): Promise<ListingPhoto> {
  const formData = new FormData();
  formData.append("image", file);
  return apiFetch<ListingPhoto>(
    `/api/v1/listings/${listingId}/photos/`,
    { method: "POST", body: formData },
    token
  );
}

export async function publishListing(listingId: number, token: string): Promise<Listing> {
  return apiFetch<Listing>(`/api/v1/listings/${listingId}/publish/`, { method: "POST" }, token);
}
```

(`CreateListingInput`'s widened-optional fields are why `ListingForm.tsx` — the existing single-page form, untouched by this feature — still compiles: it always passes every field, which remains valid against an all-optional-except-four type.)

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS, zero errors (this confirms `ListingForm.tsx` and `ListingBrowser.tsx`/`LeafletMap.tsx`, which read `location_lat`/`location_lng`/`price_cents` off `Listing`, still compile against the now-nullable fields — they only ever read these off *active* listings from the public list/detail endpoints, which always have them set, but TypeScript doesn't know that narrowing, so if this step fails, follow the compiler's pointed-to lines and add a narrowing check or non-null assertion at that specific read site, not a blanket type change).

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api/listings.ts
git commit -m "feat(frontend): nullable draft fields + updateListing/listMyDraftListings

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Wizard shared styles + RangeSlider

**Files:**
- Create: `frontend/components/listings/wizard/WizardStyles.tsx`
- Create: `frontend/components/listings/wizard/RangeSlider.tsx`

**Interfaces:**
- Produces: global `.wizard-*` CSS classes (rendered once by `WizardShell`, Task 9); `<RangeSlider>` component, consumed by `PricingStep` (Task 12) and `BasicsStep` (Task 10).

- [ ] **Step 1: Write `WizardStyles.tsx`**

Following the existing raw-CSS-string pattern (see `frontend/components/landing/LandingStyles.tsx`):

```tsx
// Scoped CSS for the listing wizard (all classes prefixed `wizard-` to avoid
// colliding with the global .field/.chip/.seg classes in app/globals.css).
// Rendered once by WizardShell. Plain <style> + dangerouslySetInnerHTML —
// same reasoning as LandingStyles.tsx: browsers parse <style> content as raw
// text, so a JSX text child would get HTML-escaped by React and mismatch on
// hydration; dangerouslySetInnerHTML skips that.
const css = `
  .wizard-root {
    width: 100%;
    min-height: 100vh;
    background: var(--paper);
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-areas: "progress progress" "top top" "illus stage" "bottom bottom";
    grid-template-rows: 4px auto 1fr auto;
  }
  @media (max-width: 860px) {
    .wizard-root { grid-template-columns: 1fr; grid-template-areas: "progress" "top" "illus" "stage" "bottom"; }
    .wizard-illustration { min-height: 220px; border-right: none !important; border-bottom: 1px solid var(--line); }
  }

  .wizard-progress-track { grid-area: progress; height: 4px; width: 100%; background: var(--line); }
  .wizard-progress-fill { height: 100%; background: linear-gradient(90deg, var(--secondary), var(--primary)); transition: width .45s cubic-bezier(.22,1,.36,1); }

  .wizard-topbar { grid-area: top; display: flex; align-items: center; justify-content: space-between; padding: 22px clamp(24px, 4vw, 56px) 0; }
  .wizard-wordmark { font-family: var(--font-heading); font-weight: 800; font-size: 14px; }
  .wizard-stepcount { font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); font-variant-numeric: tabular-nums; }

  .wizard-illustration { grid-area: illus; position: relative; overflow: hidden; border-right: 1px solid var(--line); display: flex; align-items: center; justify-content: center; background: var(--card); }
  .wizard-scene { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity .5s ease; }
  .wizard-scene.active { opacity: 1; }

  .wizard-mascot-wrap { position: relative; width: min(70%, 260px); z-index: 2; }
  .wizard-mascot { width: 100%; height: auto; overflow: visible; }
  .wizard-mascot-body { animation: wizardBob 3.2s ease-in-out infinite; transform-origin: center; }
  .wizard-mascot-shadow { animation: wizardShadowPulse 3.2s ease-in-out infinite; transform-origin: center; }
  .wizard-mascot-eye { transform-box: fill-box; transform-origin: center; animation: wizardBlink 4.6s ease-in-out infinite; }
  @keyframes wizardBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
  @keyframes wizardShadowPulse { 0%, 100% { transform: scaleX(1); opacity: .55; } 50% { transform: scaleX(.85); opacity: .35; } }
  @keyframes wizardBlink { 0%, 90%, 100% { transform: scaleY(1); } 95% { transform: scaleY(.12); } }

  .wizard-mascot-prop { position: absolute; right: 6%; top: 24%; font-size: clamp(26px, 4vw, 38px); filter: drop-shadow(0 3px 4px rgba(0,0,0,.25)); animation: wizardPropIdle 3.2s ease-in-out infinite; transform-origin: bottom center; }
  @keyframes wizardPropIdle { 0%, 100% { transform: rotate(-4deg) translateY(0); } 50% { transform: rotate(4deg) translateY(-4px); } }
  .wizard-mascot-prop.wizard-pop { animation: wizardPropPop .5s cubic-bezier(.34,1.56,.64,1); }
  @keyframes wizardPropPop { 0% { transform: scale(0) rotate(-20deg); opacity: 0; } 60% { transform: scale(1.2) rotate(6deg); opacity: 1; } 100% { transform: scale(1) rotate(0); opacity: 1; } }

  .wizard-confetti-piece { position: absolute; left: 50%; top: 38%; width: 8px; height: 8px; opacity: 0; pointer-events: none; }
  .wizard-confetti-piece.wizard-burst { animation: wizardConfettiBurst .9s ease-out forwards; }
  @keyframes wizardConfettiBurst {
    0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
    100% { transform: translate(var(--wtx), var(--wty)) rotate(var(--wrot)); opacity: 0; }
  }

  .wizard-stage { grid-area: stage; position: relative; min-height: 56vh; touch-action: pan-y; }
  .wizard-panel { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 32px clamp(24px, 4vw, 56px); }

  .wizard-stepcol { width: 100%; max-width: 480px; }
  .wizard-tag { display: inline-block; background: var(--secondary); color: #fff; padding: 5px 13px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; transform: rotate(-2deg); margin-bottom: 16px; }
  .wizard-tag.wizard-tag-alt { background: var(--primary); }
  .wizard-title { font-family: var(--font-heading); font-weight: 800; margin: 0 0 10px; font-size: clamp(24px, 3vw, 36px); line-height: 1.1; letter-spacing: -.01em; }
  .wizard-sub { margin: 0 0 26px; font-size: 14.5px; color: var(--muted); line-height: 1.55; max-width: 46ch; }

  .wizard-catgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .wizard-cattile { border: 1.5px solid var(--line); border-radius: 14px; padding: 16px; font-size: 13.5px; font-weight: 700; background: var(--paper); cursor: pointer; text-align: left; color: var(--ink); display: flex; align-items: center; gap: 10px; transition: border-color .2s, background-color .2s, box-shadow .2s; font-family: inherit; }
  .wizard-cattile .wizard-badge { width: 34px; height: 34px; border-radius: 9px; background: var(--card); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
  .wizard-cattile.wizard-picked { border-color: var(--secondary); background: color-mix(in srgb, var(--secondary) 8%, var(--paper)); box-shadow: 0 0 0 4px color-mix(in srgb, var(--secondary) 16%, transparent); }
  .wizard-cattile.wizard-pulse { animation: wizardTilePop .42s cubic-bezier(.34,1.56,.64,1); }
  @keyframes wizardTilePop { 0% { transform: scale(1); } 45% { transform: scale(1.07); } 100% { transform: scale(1); } }

  .wizard-slider { padding-top: 6px; touch-action: none; }
  .wizard-slider-track { position: relative; height: 6px; border-radius: 999px; background: var(--card); cursor: pointer; }
  .wizard-slider-fill { position: absolute; left: 0; top: 0; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--secondary), var(--primary)); transition: width .22s ease; }
  .wizard-slider-thumb { position: absolute; top: 50%; width: 22px; height: 22px; border-radius: 50%; background: var(--paper); border: 3px solid var(--primary); transform: translate(-50%, -50%); cursor: grab; box-shadow: 0 2px 6px rgba(14,13,16,.18); touch-action: none; transition: left .22s ease; }
  .wizard-slider-thumb.wizard-dragging { transition: none; cursor: grabbing; }
  .wizard-slider-track:has(.wizard-slider-thumb.wizard-dragging) .wizard-slider-fill { transition: none; }
  .wizard-slider-bubble { position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%); background: var(--ink); color: var(--paper); font-size: 11.5px; font-weight: 800; padding: 4px 9px; border-radius: 7px; white-space: nowrap; opacity: 0; pointer-events: none; font-variant-numeric: tabular-nums; transition: opacity .18s ease; }
  .wizard-slider-bubble.wizard-show { opacity: 1; }
  .wizard-slider-scale { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--muted); margin-top: 9px; font-variant-numeric: tabular-nums; }

  .wizard-bottombar { grid-area: bottom; display: flex; justify-content: space-between; align-items: center; padding: 20px clamp(24px, 4vw, 56px) 34px; border-top: 1px solid var(--line); background: var(--paper); }

  @media (prefers-reduced-motion: reduce) {
    .wizard-mascot-body, .wizard-mascot-shadow, .wizard-mascot-eye, .wizard-mascot-prop { animation: none !important; }
  }
`;

export function WizardStyles() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
```

- [ ] **Step 2: Write `RangeSlider.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";

export function RangeSlider({
  value,
  min,
  max,
  step = 10,
  format,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const pct = ((value - min) / (max - min)) * 100;

  function valueFromClientX(clientX: number) {
    const box = trackRef.current!.getBoundingClientRect();
    const raw = min + ((clientX - box.left) / box.width) * (max - min);
    return Math.round(Math.min(max, Math.max(min, raw)));
  }

  function handleThumbDown(e: React.PointerEvent<HTMLDivElement>) {
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handleThumbMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    onChange(valueFromClientX(e.clientX));
  }
  function handleThumbUp() {
    setDragging(false);
  }
  function handleTrackDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return; // clicks on the thumb itself are handled by handleThumbDown
    onChange(valueFromClientX(e.clientX));
  }
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { onChange(Math.min(max, value + step)); e.preventDefault(); }
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { onChange(Math.max(min, value - step)); e.preventDefault(); }
  }

  return (
    <div className="wizard-slider">
      <div className="wizard-slider-track" ref={trackRef} onPointerDown={handleTrackDown}>
        <div className="wizard-slider-fill" style={{ width: `${pct}%` }} />
        <div
          className={`wizard-slider-thumb${dragging ? " wizard-dragging" : ""}`}
          style={{ left: `${pct}%` }}
          tabIndex={0}
          role="slider"
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onPointerDown={handleThumbDown}
          onPointerMove={handleThumbMove}
          onPointerUp={handleThumbUp}
          onPointerCancel={handleThumbUp}
          onKeyDown={handleKeyDown}
        >
          <span className={`wizard-slider-bubble${dragging ? " wizard-show" : ""}`}>{format(value)}</span>
        </div>
      </div>
      <div className="wizard-slider-scale">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/listings/wizard/WizardStyles.tsx frontend/components/listings/wizard/RangeSlider.tsx
git commit -m "feat(frontend): wizard shared styles + draggable RangeSlider

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: CategoryTile, WizardMascot, SceneIllustration

**Files:**
- Create: `frontend/components/listings/wizard/CategoryTile.tsx`
- Create: `frontend/components/listings/wizard/WizardMascot.tsx`
- Create: `frontend/components/listings/wizard/SceneIllustration.tsx`

**Interfaces:**
- Produces: `<CategoryTile icon label active onClick>`, `<WizardMascot prop celebrate?>`, `<SceneIllustration category>` — all consumed by `WizardShell` (Task 9) and `TypeStep` (Task 10).

- [ ] **Step 1: `CategoryTile.tsx`**

```tsx
"use client";

import { useState } from "react";

export function CategoryTile({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [pulse, setPulse] = useState(false);

  function handleClick() {
    onClick();
    setPulse(false);
    // Re-trigger the CSS animation even if it's already mid-flight: forces a
    // reflow between removing and re-adding the class (same technique the
    // wizard prototype used) — without it, clicking twice in a row before
    // the first pulse finishes wouldn't restart the animation.
    requestAnimationFrame(() => setPulse(true));
  }

  return (
    <button
      type="button"
      className={`wizard-cattile${active ? " wizard-picked" : ""}${pulse ? " wizard-pulse" : ""}`}
      onClick={handleClick}
      onAnimationEnd={() => setPulse(false)}
    >
      <span className="wizard-badge">{icon}</span>
      {label}
    </button>
  );
}
```

- [ ] **Step 2: `WizardMascot.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

// The box mascot: idle bob + blink run continuously via CSS (see
// WizardStyles). `prop` is the emoji it's holding for the current step —
// changing it re-triggers the pop-in animation the same way CategoryTile
// re-triggers its pulse. `celebrate` fires a one-shot confetti burst
// (intended for the Review step) each time it flips from false to true.
type ConfettiPiece = { id: number; tx: string; ty: string; rot: string; color: string; round: boolean };

export function WizardMascot({ prop, celebrate = false }: { prop: string; celebrate?: boolean }) {
  const [pop, setPop] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    setPop(false);
    const raf = requestAnimationFrame(() => setPop(true));
    return () => cancelAnimationFrame(raf);
  }, [prop]);

  useEffect(() => {
    if (!celebrate) return;
    const colors = ["var(--primary)", "var(--secondary)", "var(--ink)"];
    const pieces: ConfettiPiece[] = Array.from({ length: 14 }, (_, i) => {
      const angle = ((Math.PI * 2) / 14) * i + (Math.random() * 0.4 - 0.2);
      const dist = 70 + Math.random() * 40;
      return {
        id: i,
        tx: `${Math.cos(angle) * dist}px`,
        ty: `${Math.sin(angle) * dist - 20}px`,
        rot: `${Math.random() * 360}deg`,
        color: colors[i % colors.length],
        round: i % 2 !== 0,
      };
    });
    setConfetti(pieces);
    setBurst(false);
    const raf = requestAnimationFrame(() => setBurst(true));
    return () => cancelAnimationFrame(raf);
  }, [celebrate]);

  return (
    <div className="wizard-mascot-wrap">
      <svg className="wizard-mascot" viewBox="0 0 160 150" overflow="visible">
        <ellipse className="wizard-mascot-shadow" cx="80" cy="132" rx="42" ry="8" fill="var(--ink)" opacity=".18" />
        <g className="wizard-mascot-body">
          <line x1="35" y1="88" x2="14" y2="72" stroke="var(--secondary-dark)" strokeWidth="6" strokeLinecap="round" />
          <line x1="125" y1="88" x2="146" y2="72" stroke="var(--secondary-dark)" strokeWidth="6" strokeLinecap="round" />
          <rect x="35" y="52" width="90" height="70" rx="10" fill="var(--secondary)" />
          <rect x="35" y="52" width="90" height="16" rx="8" fill="var(--secondary-dark)" />
          <rect x="70" y="38" width="20" height="42" fill="var(--primary)" />
          <rect x="35" y="78" width="90" height="11" fill="var(--primary)" />
          <circle className="wizard-mascot-eye" cx="63" cy="102" r="6" fill="var(--ink)" />
          <circle className="wizard-mascot-eye" cx="97" cy="102" r="6" fill="var(--ink)" />
          <path d="M66 114 Q80 122 94 114" stroke="var(--ink)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </g>
      </svg>
      <div className={`wizard-mascot-prop${pop ? " wizard-pop" : ""}`} onAnimationEnd={() => setPop(false)}>
        {prop}
      </div>
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className={`wizard-confetti-piece${burst ? " wizard-burst" : ""}`}
          style={
            {
              "--wtx": piece.tx,
              "--wty": piece.ty,
              "--wrot": piece.rot,
              background: piece.color,
              borderRadius: piece.round ? "50%" : "2px",
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `SceneIllustration.tsx`**

```tsx
// One flat-vector SVG scene per category, crossfaded via the `active` class
// (opacity transition defined in WizardStyles). `category` is one of the
// four ListingCategory values the wizard offers, or null before a pick.
const SCENES: { cat: string; render: () => JSX.Element }[] = [
  {
    cat: "spare_room",
    render: () => (
      <>
        <rect x="205" y="40" width="60" height="60" fill="none" stroke="var(--line)" strokeWidth="4" />
        <line x1="235" y1="40" x2="235" y2="100" stroke="var(--line)" strokeWidth="4" />
        <line x1="205" y1="70" x2="265" y2="70" stroke="var(--line)" strokeWidth="4" />
        <rect x="18" y="120" width="30" height="45" rx="6" fill="var(--paper)" stroke="var(--line)" strokeWidth="2" />
        <rect x="25" y="150" width="110" height="55" rx="8" fill="var(--paper)" stroke="var(--line)" strokeWidth="2" />
        <rect x="25" y="150" width="110" height="16" fill="var(--secondary)" />
      </>
    ),
  },
  {
    cat: "garage",
    render: () => (
      <>
        <rect x="20" y="30" width="260" height="60" fill="var(--paper)" stroke="var(--line)" strokeWidth="3" />
        <line x1="20" y1="45" x2="280" y2="45" stroke="var(--line)" strokeWidth="2" />
        <line x1="20" y1="60" x2="280" y2="60" stroke="var(--line)" strokeWidth="2" />
        <line x1="20" y1="75" x2="280" y2="75" stroke="var(--line)" strokeWidth="2" />
        <rect x="80" y="130" width="90" height="30" rx="12" fill="var(--primary)" />
        <rect x="55" y="150" width="150" height="45" rx="16" fill="var(--primary)" />
        <circle cx="90" cy="196" r="16" fill="var(--ink)" />
        <circle cx="180" cy="196" r="16" fill="var(--ink)" />
      </>
    ),
  },
  {
    cat: "shoplot_back_room",
    render: () => (
      <>
        <line x1="20" y1="60" x2="280" y2="60" stroke="var(--line)" strokeWidth="5" />
        <line x1="20" y1="105" x2="280" y2="105" stroke="var(--line)" strokeWidth="5" />
        <line x1="20" y1="150" x2="280" y2="150" stroke="var(--line)" strokeWidth="5" />
        <rect x="35" y="35" width="30" height="25" fill="var(--secondary)" />
        <rect x="90" y="30" width="26" height="30" fill="var(--primary)" />
        <rect x="150" y="35" width="34" height="25" fill="var(--secondary)" />
        <rect x="45" y="78" width="30" height="27" fill="var(--primary)" />
        <rect x="110" y="78" width="26" height="27" fill="var(--secondary)" />
        <rect x="60" y="120" width="34" height="30" fill="var(--secondary)" />
        <rect x="150" y="118" width="28" height="32" fill="var(--primary)" />
      </>
    ),
  },
  {
    cat: "warehouse_bay",
    render: () => (
      <>
        <rect x="215" y="20" width="65" height="185" fill="none" stroke="var(--line)" strokeWidth="4" />
        <line x1="20" y1="200" x2="20" y2="40" stroke="var(--muted)" strokeWidth="6" />
        <line x1="70" y1="200" x2="70" y2="40" stroke="var(--muted)" strokeWidth="6" />
        <line x1="20" y1="80" x2="70" y2="80" stroke="var(--muted)" strokeWidth="5" />
        <line x1="20" y1="140" x2="70" y2="140" stroke="var(--muted)" strokeWidth="5" />
        <rect x="26" y="88" width="38" height="26" fill="var(--secondary)" />
        <rect x="26" y="148" width="38" height="26" fill="var(--primary)" />
        <rect x="95" y="165" width="40" height="40" fill="var(--secondary)" />
        <rect x="140" y="150" width="46" height="55" fill="var(--primary)" />
      </>
    ),
  },
];

export function SceneIllustration({ category }: { category: string | null }) {
  // "other" has no dedicated scene (spec's Out of scope) — falls through to
  // the same empty/default room as no category picked yet.
  const isDefault = category === null || category === "other";
  return (
    <div className="wizard-scene-stack" style={{ position: "absolute", inset: 0 }}>
      <svg
        className={`wizard-scene${isDefault ? " active" : ""}`}
        viewBox="0 0 300 260"
        preserveAspectRatio="xMidYMax slice"
      >
        <rect width="300" height="260" fill="var(--card)" />
        <rect y="205" width="300" height="55" fill="var(--line)" />
      </svg>
      {SCENES.map(({ cat, render }) => (
        <svg
          key={cat}
          className={`wizard-scene${category === cat ? " active" : ""}`}
          viewBox="0 0 300 260"
          preserveAspectRatio="xMidYMax slice"
        >
          <rect width="300" height="260" fill="var(--card)" />
          <rect y="205" width="300" height="55" fill="var(--line)" />
          {render()}
        </svg>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/listings/wizard/CategoryTile.tsx frontend/components/listings/wizard/WizardMascot.tsx frontend/components/listings/wizard/SceneIllustration.tsx
git commit -m "feat(frontend): wizard mascot, category scenes, category tile

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: WizardShell — layout, progress, nav, swipe

**Files:**
- Create: `frontend/components/listings/wizard/WizardShell.tsx`

**Interfaces:**
- Consumes: `WizardStyles`, `WizardMascot`, `SceneIllustration` (Tasks 7–8).
- Produces:

```typescript
export const STEP_PROPS = ["🔍", "✏️", "📍", "🏷️", "📸", "🎉"];

export function WizardShell(props: {
  steps: React.ReactNode[];       // this page's own steps (2 for NewListingWizard, 4 for DraftWizard)
  stepIndex: number;              // index into `steps` — drives which panel shows + swipe math
  globalStepIndex: number;        // 0-5 across the whole 6-step journey — drives progress bar, "Step X / 6" counter, and the mascot's prop/celebrate state
  globalStepCount: number;        // always 6 in this wizard, passed explicitly rather than hardcoded so WizardShell doesn't bake in a step count
  category: string | null;
  onIndexChange: (index: number) => void; // local index — swipe and Back call this directly
  nextLabel: string;
  backDisabled?: boolean;
  onNext: () => void;       // validated advance — WizardShell calls this instead of onIndexChange for the Continue button so the parent can block/PATCH first
}): JSX.Element
```

  `stepIndex`/`steps` and `globalStepIndex`/`globalStepCount` are deliberately separate: each of the two wizard pages (`NewListingWizard`, `DraftWizard`) only ever renders its own slice of the journey through a fresh `WizardShell` instance, so the shell has no way to know "step 1 of 4 here" is actually "step 3 of 6 overall" unless the caller tells it. Consumed by `NewListingWizard` (Task 10) and `DraftWizard` (Task 15).

- [ ] **Step 1: Write `WizardShell.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { WizardStyles } from "./WizardStyles";
import { WizardMascot } from "./WizardMascot";
import { SceneIllustration } from "./SceneIllustration";

export const STEP_PROPS = ["🔍", "✏️", "📍", "🏷️", "📸", "🎉"];

const IGNORE_SELECTOR = "input, textarea, button, [role='slider'], .wizard-slider-track";

export function WizardShell({
  steps,
  stepIndex,
  globalStepIndex,
  globalStepCount,
  category,
  onIndexChange,
  onNext,
  nextLabel,
  backDisabled,
}: {
  steps: React.ReactNode[];
  stepIndex: number;
  globalStepIndex: number;
  globalStepCount: number;
  category: string | null;
  onIndexChange: (index: number) => void;
  onNext: () => void;
  nextLabel: string;
  backDisabled?: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevIndexRef = useRef(stepIndex);

  // Button/programmatic navigation: animate whenever stepIndex changes from
  // the outside (not from the swipe handler below, which manages its own
  // transform/opacity directly and calls onIndexChange only once settled).
  useEffect(() => {
    const prev = prevIndexRef.current;
    if (prev === stepIndex) return;
    const dir = stepIndex > prev ? 1 : -1;
    const cur = panelRefs.current[prev];
    const nxt = panelRefs.current[stepIndex];
    if (cur && nxt) {
      nxt.style.transition = "none";
      nxt.style.transform = `translateX(${26 * dir}px) scale(.97)`;
      nxt.style.opacity = "0";
      nxt.style.display = "flex";
      nxt.style.zIndex = "2";
      cur.style.zIndex = "1";
      // Force a reflow so the "none" transition actually applies before we
      // remove it — otherwise the browser coalesces both style writes into
      // one paint and there's nothing to animate from.
      void nxt.offsetWidth;
      nxt.style.transition = "";
      nxt.style.transform = "translateX(0) scale(1)";
      nxt.style.opacity = "1";
      cur.style.transform = `translateX(${-26 * dir}px) scale(.97)`;
      cur.style.opacity = "0";
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.setTimeout(() => {
        cur.style.display = "none";
        cur.style.transform = "";
        cur.style.opacity = "";
        cur.style.zIndex = "";
        nxt.style.zIndex = "";
      }, reduced ? 0 : 460);
    }
    prevIndexRef.current = stepIndex;
  }, [stepIndex]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let startX = 0, dx = 0, dragging = false, neighborIdx = -1, dir = 0;

    function panel(i: number) {
      return panelRefs.current[i];
    }

    function onDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (target.closest(IGNORE_SELECTOR)) return;
      dragging = true;
      startX = e.clientX;
      dx = 0;
      stage!.setPointerCapture(e.pointerId);
    }

    function onMove(e: PointerEvent) {
      if (!dragging) return;
      dx = e.clientX - startX;
      dir = dx < 0 ? 1 : -1;
      const candidate = prevIndexRef.current + dir;
      neighborIdx = candidate >= 0 && candidate < steps.length ? candidate : -1;
      if (neighborIdx === -1) dx *= 0.35;

      const cur = panel(prevIndexRef.current);
      if (!cur) return;
      cur.style.transition = "none";
      cur.style.transform = `translateX(${dx}px)`;

      if (neighborIdx !== -1) {
        const w = stage!.getBoundingClientRect().width;
        const nb = panel(neighborIdx);
        if (nb) {
          nb.style.transition = "none";
          nb.style.display = "flex";
          nb.style.opacity = "1";
          nb.style.zIndex = "0";
          cur.style.zIndex = "1";
          nb.style.transform = `translateX(${dx - dir * w}px)`;
        }
      }
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      const w = stage!.getBoundingClientRect().width;
      const cur = panel(prevIndexRef.current);
      if (!cur) return;
      const threshold = w * 0.22;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (neighborIdx !== -1 && Math.abs(dx) > threshold) {
        const nb = panel(neighborIdx)!;
        cur.style.transition = "";
        nb.style.transition = "";
        cur.style.transform = `translateX(${-dir * w}px)`;
        nb.style.transform = "translateX(0)";
        const landed = neighborIdx;
        window.setTimeout(() => {
          cur.style.display = "none";
          cur.style.transform = "";
          cur.style.zIndex = "";
          nb.style.zIndex = "";
        }, reduced ? 0 : 280);
        prevIndexRef.current = landed;
        onIndexChange(landed);
      } else {
        cur.style.transition = "";
        cur.style.transform = "translateX(0)";
        if (neighborIdx !== -1) {
          const nb = panel(neighborIdx)!;
          nb.style.transition = "";
          nb.style.transform = `translateX(${dir * w}px)`;
          window.setTimeout(() => {
            nb.style.display = "none";
            nb.style.transform = "";
            nb.style.zIndex = "";
          }, reduced ? 0 : 280);
        }
      }
      neighborIdx = -1;
      dx = 0;
    }

    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    return () => {
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
    };
    // steps.length and onIndexChange are stable for the lifetime of a given
    // wizard page (steps array is defined once per render tree, onIndexChange
    // is a useState setter or equivalent) — re-binding on every stepIndex
    // change would drop mid-drag listeners, so this intentionally only
    // depends on the things that actually change the handler's closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length]);

  return (
    <div className="wizard-root">
      <WizardStyles />
      <div className="wizard-progress-track">
        <div
          className="wizard-progress-fill"
          style={{ width: `${((globalStepIndex + 1) / globalStepCount) * 100}%` }}
        />
      </div>
      <div className="wizard-topbar">
        <div className="wizard-wordmark">sqftex</div>
        <div className="wizard-stepcount">
          Step {globalStepIndex + 1} / {globalStepCount}
        </div>
      </div>
      <div className="wizard-illustration">
        <SceneIllustration category={category} />
        <WizardMascot prop={STEP_PROPS[globalStepIndex]} celebrate={globalStepIndex === globalStepCount - 1} />
      </div>
      <div className="wizard-stage" ref={stageRef}>
        {steps.map((step, i) => (
          <div
            key={i}
            className="wizard-panel"
            ref={(el) => {
              panelRefs.current[i] = el;
            }}
            style={{ display: i === stepIndex ? "flex" : "none" }}
          >
            <div className="wizard-stepcol">{step}</div>
          </div>
        ))}
      </div>
      <div className="wizard-bottombar">
        <button
          type="button"
          className="btn-outline"
          onClick={() => onIndexChange(stepIndex - 1)}
          style={{ visibility: backDisabled ? "hidden" : "visible" }}
        >
          ← Back
        </button>
        <button type="button" className="btn-primary" onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/listings/wizard/WizardShell.tsx
git commit -m "feat(frontend): WizardShell — progress, illustration pane, swipe nav

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: Steps 1–2 (Type, Basics) + draft creation

**Files:**
- Create: `frontend/components/listings/wizard/TypeStep.tsx`
- Create: `frontend/components/listings/wizard/BasicsStep.tsx`
- Create: `frontend/components/listings/wizard/NewListingWizard.tsx`
- Modify: `frontend/app/listings/new/page.tsx`

**Interfaces:**
- Consumes: `WizardShell` (Task 9), `CategoryTile`/`RangeSlider` (Tasks 7–8), `createListing`/`listMyDraftListings` (Task 6).
- Produces: on completing Basics, navigates to `/listings/new/[draftId]?step=location` — consumed by Task 15's route.

- [ ] **Step 1: `TypeStep.tsx`**

```tsx
"use client";

import { CategoryTile } from "./CategoryTile";
import { LISTING_CATEGORIES } from "@/lib/listingCategories";

const ICONS: Record<string, string> = {
  spare_room: "🛏️",
  garage: "🚗",
  shoplot_back_room: "🏪",
  warehouse_bay: "🏭",
  other: "📦",
};

export function TypeStep({
  category,
  onSelect,
}: {
  category: string | null;
  onSelect: (category: string) => void;
}) {
  return (
    <div>
      <span className="wizard-tag">Step 1 of 6</span>
      <h2 className="wizard-title">What kind of space is it?</h2>
      <p className="wizard-sub">This shapes the questions we ask next.</p>
      <div className="wizard-catgrid">
        {LISTING_CATEGORIES.map((c) => (
          <CategoryTile
            key={c.value}
            icon={ICONS[c.value]}
            label={c.label}
            active={category === c.value}
            onClick={() => onSelect(c.value)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `BasicsStep.tsx`**

```tsx
"use client";

import { RangeSlider } from "./RangeSlider";

export function BasicsStep({
  title,
  description,
  sizeSqft,
  onTitleChange,
  onDescriptionChange,
  onSizeChange,
}: {
  title: string;
  description: string;
  sizeSqft: number;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onSizeChange: (v: number) => void;
}) {
  return (
    <div>
      <span className="wizard-tag wizard-tag-alt">Step 2 of 6</span>
      <h2 className="wizard-title">Tell us the basics</h2>
      <p className="wizard-sub">A clear title helps renters trust the listing.</p>
      <div className="field" style={{ marginBottom: 15 }}>
        <label htmlFor="w-title">Title</label>
        <input
          id="w-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g. Ground-floor warehouse bay, PJ"
        />
      </div>
      <div className="field" style={{ marginBottom: 15 }}>
        <label htmlFor="w-desc">Description</label>
        <textarea
          id="w-desc"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="What makes this space good for storage?"
        />
      </div>
      <div className="field">
        <label>Size (sqft)</label>
        <RangeSlider
          value={sizeSqft}
          min={50}
          max={2000}
          step={10}
          format={(v) => `${v.toLocaleString()} sqft`}
          onChange={onSizeChange}
          ariaLabel="Size in square feet"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `NewListingWizard.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { WizardShell } from "./WizardShell";
import { TypeStep } from "./TypeStep";
import { BasicsStep } from "./BasicsStep";
import { createListing, listMyDraftListings, type Listing } from "@/lib/api/listings";

export function NewListingWizard() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [resumeDraft, setResumeDraft] = useState<Listing | null | undefined>(undefined); // undefined = still checking
  const [stepIndex, setStepIndex] = useState(0);
  const [category, setCategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sizeSqft, setSizeSqft] = useState(320);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token) return;
      const drafts = await listMyDraftListings(token);
      if (!cancelled) setResumeDraft(drafts[0] ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  async function handleContinueFromBasics() {
    if (!category || !title.trim() || !description.trim()) {
      setError("Fill in a title and description before continuing.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in.");
      const draft = await createListing(
        { title, description, category, size_sqft: sizeSqft },
        token
      );
      router.push(`/listings/new/${draft.id}?step=location`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your listing. Try again.");
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (stepIndex === 0) {
      if (!category) {
        setError("Pick a category to continue.");
        return;
      }
      setError(null);
      setStepIndex(1);
      return;
    }
    handleContinueFromBasics();
  }

  if (resumeDraft === undefined) {
    return null; // brief loading gap while the draft check resolves
  }

  if (resumeDraft) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "96px 32px" }}>
        <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 16, textAlign: "center" }}>
          <h1 style={{ fontSize: 26 }}>Continue where you left off?</h1>
          <p style={{ color: "var(--muted)" }}>
            You have an unfinished listing: <strong>{resumeDraft.title}</strong>
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => router.push(`/listings/new/${resumeDraft.id}`)}
            >
              Continue draft
            </button>
            <button type="button" className="btn-outline" onClick={() => setResumeDraft(null)}>
              Start new
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p role="alert" style={{ textAlign: "center", padding: "8px 24px 0" }}>
          {error}
        </p>
      )}
      <WizardShell
        steps={[
          <TypeStep key="type" category={category} onSelect={setCategory} />,
          <BasicsStep
            key="basics"
            title={title}
            description={description}
            sizeSqft={sizeSqft}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onSizeChange={setSizeSqft}
          />,
        ]}
        stepIndex={stepIndex}
        globalStepIndex={stepIndex}
        globalStepCount={6}
        category={category}
        onIndexChange={setStepIndex}
        onNext={handleNext}
        nextLabel={submitting ? "Saving…" : "Continue →"}
        backDisabled={stepIndex === 0}
      />
    </div>
  );
}
```

- [ ] **Step 4: Wire up `app/listings/new/page.tsx`**

Replace its body (the verification gate stays identical to today; only the final render changes):

```tsx
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { NewListingWizard } from "@/components/listings/wizard/NewListingWizard";
import { NavBar } from "@/components/layout/NavBar";
import { getMe } from "@/lib/api/users";

export default async function NewListingPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  const me = await getMe();

  if (!me) {
    redirect("/login");
  }

  if (!me.is_verified) {
    return (
      <div>
        <NavBar variant="app" />
        <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
          <div
            style={{
              maxWidth: 480,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              padding: 32,
              border: "1px solid var(--line)",
              borderRadius: 16,
              boxShadow: "0 2px 10px rgba(14,13,16,0.06)",
            }}
          >
            <div
              className="label"
              style={{
                alignSelf: "flex-start",
                color: "#fff",
                background: "var(--secondary)",
                padding: "6px 12px",
                borderRadius: 999,
                transform: "rotate(-3deg)",
              }}
            >
              Verification required
            </div>
            <h1 style={{ fontSize: 28 }}>VERIFY YOUR ID TO CONTINUE</h1>
            <p style={{ fontSize: 15, lineHeight: 1.6, fontWeight: 500 }}>
              You need to complete ID verification before you can create a listing. Upload your
              NRIC and wait for approval.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavBar variant="app" />
      <NewListingWizard />
    </div>
  );
}
```

Note: the original page called `getToken()` and passed the token into `getMe(token)`; `NewListingWizard` is a client component that fetches its own token via `useAuth()` for the draft check and the create call, so the server page no longer needs to thread a token through — it keeps calling `getMe()` (no-arg form already supported by `lib/api/users.ts`'s optional `token` param) purely for the verification gate.

- [ ] **Step 5: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Manual check**

Run: `cd frontend && npm run dev`, sign in as a verified demo user (see `backend/scripts/seed.ts` for demo credentials), visit `/listings/new`. Confirm: category tiles are clickable (glow-pulse + mascot's magnifying glass 🔍), Continue advances to Basics (mascot switches to ✏️, illustration crossfades to the picked category's scene), filling in title/description and continuing creates a draft and redirects to `/listings/new/<id>?step=location` (Task 15 renders that route — a 404/blank page there until Task 15 lands is expected at this point in the plan).

- [ ] **Step 7: Commit**

```bash
git add frontend/components/listings/wizard/TypeStep.tsx frontend/components/listings/wizard/BasicsStep.tsx frontend/components/listings/wizard/NewListingWizard.tsx frontend/app/listings/new/page.tsx
git commit -m "feat(frontend): wizard steps 1-2 (Type, Basics) + draft creation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 11: LocationStep with map pin picker

**Files:**
- Create: `frontend/components/map/LocationPicker.tsx`
- Create: `frontend/components/map/LocationPickerEmbed.tsx`
- Create: `frontend/components/listings/wizard/LocationStep.tsx`

**Interfaces:**
- Produces: `<LocationPickerEmbed lat lng onMove>` (SSR-safe wrapper, mirrors `MapEmbed.tsx`); `<LocationStep lat lng address onLatLngChange onAddressChange>` — consumed by `DraftWizard` (Task 15).

- [ ] **Step 1: `LocationPicker.tsx`**

```tsx
"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Same free tile source as LeafletMap.tsx (CARTO Positron, or MapTiler if a
// key is configured) — see that file's comment for the reasoning.
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const TILE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`
  : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION = MAPTILER_KEY
  ? '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
  : '&copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';

const DEFAULT_CENTER: [number, number] = [3.1, 101.62]; // same Klang Valley default as LeafletMap.tsx

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="font-size:32px;transform:translate(-50%,-100%);filter:drop-shadow(0 3px 4px rgba(0,0,0,.32));">📍</div>`,
  iconSize: [0, 0],
});

function ClickToPlace({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationPicker({
  lat,
  lng,
  onMove,
}: {
  lat: number | null;
  lng: number | null;
  onMove: (lat: number, lng: number) => void;
}) {
  const center: [number, number] = lat !== null && lng !== null ? [lat, lng] : DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={lat !== null ? 15 : 11}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
      attributionControl={false}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <ClickToPlace onMove={onMove} />
      {lat !== null && lng !== null && (
        <Marker
          position={[lat, lng]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const m = e.target as L.Marker;
              const pos = m.getLatLng();
              onMove(pos.lat, pos.lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
}
```

- [ ] **Step 2: `LocationPickerEmbed.tsx`**

```tsx
"use client";

import dynamic from "next/dynamic";

// Same SSR-avoidance wrapper pattern as components/map/MapEmbed.tsx —
// react-leaflet touches `window` on mount.
const LocationPicker = dynamic(() => import("./LocationPicker").then((m) => m.LocationPicker), {
  ssr: false,
  loading: () => <div style={{ width: "100%", height: "100%", background: "var(--card)" }} />,
});

export function LocationPickerEmbed({
  lat,
  lng,
  onMove,
}: {
  lat: number | null;
  lng: number | null;
  onMove: (lat: number, lng: number) => void;
}) {
  return <LocationPicker lat={lat} lng={lng} onMove={onMove} />;
}
```

- [ ] **Step 3: `LocationStep.tsx`**

```tsx
"use client";

import { LocationPickerEmbed } from "@/components/map/LocationPickerEmbed";

export function LocationStep({
  lat,
  lng,
  address,
  onLatLngChange,
  onAddressChange,
}: {
  lat: number | null;
  lng: number | null;
  address: string;
  onLatLngChange: (lat: number, lng: number) => void;
  onAddressChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="wizard-tag wizard-tag-alt">Step 3 of 6</span>
      <h2 className="wizard-title">Where is it?</h2>
      <p className="wizard-sub">Click the map to drop the pin on the exact spot, or drag it once placed.</p>
      <div style={{ height: 220, borderRadius: 14, overflow: "hidden", border: "1.5px solid var(--line)", marginBottom: 16 }}>
        <LocationPickerEmbed lat={lat} lng={lng} onMove={onLatLngChange} />
      </div>
      <div className="field">
        <label htmlFor="w-address">Address</label>
        <input
          id="w-address"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Street, area"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/map/LocationPicker.tsx frontend/components/map/LocationPickerEmbed.tsx frontend/components/listings/wizard/LocationStep.tsx
git commit -m "feat(frontend): LocationStep with click/drag map pin picker

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 12: PricingStep

**Files:**
- Create: `frontend/components/listings/wizard/PricingStep.tsx`

**Interfaces:**
- Consumes: `RangeSlider` (Task 7).
- Produces: `<PricingStep priceRM priceUnit onPriceChange onUnitChange>` — consumed by `DraftWizard` (Task 15).

- [ ] **Step 1: Write `PricingStep.tsx`**

```tsx
"use client";

import { RangeSlider } from "./RangeSlider";

export function PricingStep({
  priceRM,
  priceUnit,
  onPriceChange,
  onUnitChange,
}: {
  priceRM: number;
  priceUnit: "daily" | "monthly";
  onPriceChange: (v: number) => void;
  onUnitChange: (v: "daily" | "monthly") => void;
}) {
  return (
    <div>
      <span className="wizard-tag wizard-tag-alt">Step 4 of 6</span>
      <h2 className="wizard-title">Set your price</h2>
      <p className="wizard-sub">You can change this later.</p>
      <div className="field" style={{ marginBottom: 15 }}>
        <label>Price (RM)</label>
        <RangeSlider
          value={priceRM}
          min={20}
          max={3000}
          step={10}
          format={(v) => `RM ${v.toLocaleString()}`}
          onChange={onPriceChange}
          ariaLabel="Price in ringgit"
        />
      </div>
      <div className="field">
        <label>Billed</label>
        <div style={{ display: "flex", border: "1px solid var(--ink)", borderRadius: 10, overflow: "hidden", maxWidth: 280 }}>
          <button
            type="button"
            className="seg"
            data-active={priceUnit === "daily"}
            onClick={() => onUnitChange("daily")}
          >
            DAILY
          </button>
          <button
            type="button"
            className="seg"
            data-active={priceUnit === "monthly"}
            onClick={() => onUnitChange("monthly")}
          >
            MONTHLY
          </button>
        </div>
      </div>
    </div>
  );
}
```

(`.seg`/`data-active` reuses the existing segmented-control styling from `app/globals.css` — same markup `ListingForm.tsx` already uses for this exact control.)

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/listings/wizard/PricingStep.tsx
git commit -m "feat(frontend): PricingStep with draggable price slider

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 13: PhotoUploader + RulesPhotosStep

**Files:**
- Create: `frontend/components/listings/wizard/PhotoUploader.tsx`
- Create: `frontend/components/listings/wizard/RulesPhotosStep.tsx`

**Interfaces:**
- Produces: `<PhotoUploader files onFilesChange>` where `files: File[]`; `<RulesPhotosStep accessRules prohibitedItems files onAccessRulesChange onProhibitedItemsChange onFilesChange>` — consumed by `DraftWizard` (Task 15).

Photos are staged client-side (added/reordered/removed as plain `File[]`) and only actually uploaded (via the existing `addListingPhoto`, one call per file, in array order) when the host continues past this step — the backend has no delete or reorder endpoint for already-uploaded photos, so reordering/removing only needs to work before upload, which keeps this step self-contained with zero new backend surface. `DraftWizard` (Task 15) owns the actual upload loop.

- [ ] **Step 1: Write `PhotoUploader.tsx`**

```tsx
"use client";

import { useRef } from "react";

export function PhotoUploader({
  files,
  onFilesChange,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length > 0) onFilesChange([...files, ...picked]);
    e.target.value = ""; // allow picking the same file again after removing it
  }

  function handleRemove(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  function handleReorder(from: number, to: number) {
    const next = [...files];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onFilesChange(next);
  }

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {files.map((file, i) => (
        <div
          key={`${file.name}-${i}`}
          draggable
          onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const from = Number(e.dataTransfer.getData("text/plain"));
            handleReorder(from, i);
          }}
          style={{
            width: 78, height: 78, borderRadius: 11, border: "1.5px solid var(--line)",
            position: "relative", overflow: "hidden", cursor: "grab",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={URL.createObjectURL(file)}
            alt={`Photo ${i + 1}`}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <button
            type="button"
            onClick={() => handleRemove(i)}
            aria-label={`Remove photo ${i + 1}`}
            style={{
              position: "absolute", top: -6, right: -6, background: "var(--ink)", color: "var(--paper)",
              width: 19, height: 19, borderRadius: "50%", fontSize: 10, border: "none", cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          width: 78, height: 78, borderRadius: 11, border: "1.5px dashed var(--line)",
          background: "none", cursor: "pointer", fontSize: 11, color: "var(--muted)",
        }}
      >
        + Add
      </button>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleAdd} style={{ display: "none" }} />
    </div>
  );
}
```

- [ ] **Step 2: Write `RulesPhotosStep.tsx`**

```tsx
"use client";

import { PhotoUploader } from "./PhotoUploader";

export function RulesPhotosStep({
  accessRules,
  prohibitedItems,
  files,
  onAccessRulesChange,
  onProhibitedItemsChange,
  onFilesChange,
}: {
  accessRules: string;
  prohibitedItems: string;
  files: File[];
  onAccessRulesChange: (v: string) => void;
  onProhibitedItemsChange: (v: string) => void;
  onFilesChange: (files: File[]) => void;
}) {
  return (
    <div>
      <span className="wizard-tag wizard-tag-alt">Step 5 of 6</span>
      <h2 className="wizard-title">Rules &amp; photos</h2>
      <p className="wizard-sub">Add at least one photo — listings need one to publish.</p>
      <div className="field" style={{ marginBottom: 15 }}>
        <label htmlFor="w-rules">Access rules</label>
        <textarea
          id="w-rules"
          value={accessRules}
          onChange={(e) => onAccessRulesChange(e.target.value)}
          placeholder="e.g. Weekdays 9am-6pm, gate code shared after booking"
        />
      </div>
      <div className="field" style={{ marginBottom: 15 }}>
        <label htmlFor="w-prohibited">Prohibited items</label>
        <textarea
          id="w-prohibited"
          value={prohibitedItems}
          onChange={(e) => onProhibitedItemsChange(e.target.value)}
          placeholder="e.g. No perishables, no flammables"
        />
      </div>
      <div className="field">
        <label>Photos</label>
        <PhotoUploader files={files} onFilesChange={onFilesChange} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/listings/wizard/PhotoUploader.tsx frontend/components/listings/wizard/RulesPhotosStep.tsx
git commit -m "feat(frontend): RulesPhotosStep with staged multi-photo upload/reorder

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 14: ReviewStep

**Files:**
- Create: `frontend/components/listings/wizard/ReviewStep.tsx`

**Interfaces:**
- Produces: `<ReviewStep draft category title description sizeSqft address priceRM priceUnit photoCount onEditStep publishing error>` — consumed by `DraftWizard` (Task 15).

- [ ] **Step 1: Write `ReviewStep.tsx`**

```tsx
"use client";

import { categoryLabel } from "@/lib/listingCategories";

export function ReviewStep({
  category,
  title,
  sizeSqft,
  address,
  priceRM,
  priceUnit,
  photoCount,
  onEditStep,
  publishing,
  error,
}: {
  category: string;
  title: string;
  sizeSqft: number;
  address: string;
  priceRM: number;
  priceUnit: "daily" | "monthly";
  photoCount: number;
  onEditStep: (stepIndex: number) => void;
  publishing: boolean;
  error: string | null;
}) {
  return (
    <div>
      <span className="wizard-tag wizard-tag-alt">Step 6 of 6</span>
      <h2 className="wizard-title">Review &amp; publish</h2>
      <p className="wizard-sub">Check everything, then go live.</p>
      {error && <p role="alert">{error}</p>}
      <ReviewRow label="Type" value={categoryLabel(category)} onEdit={() => onEditStep(0)} />
      <ReviewRow label="Basics" value={`${title} · ${sizeSqft} sqft`} onEdit={() => onEditStep(1)} />
      <ReviewRow label="Location" value={address} onEdit={() => onEditStep(2)} />
      <ReviewRow label="Pricing" value={`RM ${priceRM} / ${priceUnit}`} onEdit={() => onEditStep(3)} />
      <ReviewRow
        label="Rules & photos"
        value={photoCount === 1 ? "1 photo attached" : `${photoCount} photos attached`}
        onEdit={() => onEditStep(4)}
      />
      {publishing && <p style={{ marginTop: 16, color: "var(--muted)" }}>Publishing…</p>}
    </div>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "12px 0", borderBottom: "1px solid var(--card)", fontSize: 14, gap: 12,
      }}
    >
      <div>
        <b style={{ display: "block", fontSize: 10.5, textTransform: "uppercase", color: "var(--muted)", marginBottom: 4, fontWeight: 800, letterSpacing: "0.03em" }}>
          {label}
        </b>
        {value}
      </div>
      <button
        type="button"
        onClick={onEdit}
        style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
      >
        Edit
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/listings/wizard/ReviewStep.tsx
git commit -m "feat(frontend): ReviewStep with per-section edit links

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 15: DraftWizard (steps 3–6) + `/listings/new/[draftId]` route

**Files:**
- Create: `frontend/components/listings/wizard/DraftWizard.tsx`
- Create: `frontend/app/listings/new/[draftId]/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 6–14.
- Produces: the completed wizard, redirecting to `/listings/[id]` on successful publish.

- [ ] **Step 1: Write `DraftWizard.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { WizardShell } from "./WizardShell";
import { LocationStep } from "./LocationStep";
import { PricingStep } from "./PricingStep";
import { RulesPhotosStep } from "./RulesPhotosStep";
import { ReviewStep } from "./ReviewStep";
import {
  addListingPhoto,
  getListing,
  publishListing,
  updateListing,
  type Listing,
} from "@/lib/api/listings";

// Steps 3-6 map to wizard indices 0-3 here (the shell always starts a fresh
// index at 0 for whatever `steps` array it's given — TypeStep/BasicsStep
// live in NewListingWizard's own separate WizardShell instance). The step
// *labels* shown to the host ("Step 3 of 6"… "Step 6 of 6") are hardcoded
// into each step component to read correctly regardless of which shell
// instance renders them.
const STEP_NAMES = ["location", "pricing", "rules-photos", "review"] as const;
type StepName = (typeof STEP_NAMES)[number];

function firstIncompleteStep(draft: Listing): number {
  if (draft.location_lat === null || draft.location_lng === null || !draft.address) return 0;
  if (draft.price_cents === null || draft.price_unit === null) return 1;
  if (draft.photos.length === 0) return 2;
  return 3;
}

export function DraftWizard({ draftId }: { draftId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();

  const [draft, setDraft] = useState<Listing | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [priceRM, setPriceRM] = useState(680);
  const [priceUnit, setPriceUnit] = useState<"daily" | "monthly">("monthly");
  const [accessRules, setAccessRules] = useState("");
  const [prohibitedItems, setProhibitedItems] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedPhotoCount, setUploadedPhotoCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      const loaded = await getListing(draftId, token);
      if (cancelled) return;
      setDraft(loaded);
      if (loaded.location_lat !== null) setLat(loaded.location_lat);
      if (loaded.location_lng !== null) setLng(loaded.location_lng);
      if (loaded.address) setAddress(loaded.address);
      if (loaded.price_cents !== null) setPriceRM(loaded.price_cents / 100);
      if (loaded.price_unit) setPriceUnit(loaded.price_unit);
      setAccessRules(loaded.access_rules);
      setProhibitedItems(loaded.prohibited_items);
      setUploadedPhotoCount(loaded.photos.length);

      const stepParam = searchParams.get("step") as StepName | null;
      const paramIndex = stepParam ? STEP_NAMES.indexOf(stepParam) : -1;
      setStepIndex(paramIndex !== -1 ? paramIndex : firstIncompleteStep(loaded));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  function handleIndexChange(index: number) {
    setStepIndex(index);
    router.replace(`/listings/new/${draftId}?step=${STEP_NAMES[index]}`);
  }

  async function handleNext() {
    setError(null);
    const token = await getToken();
    if (!token) {
      setError("Not signed in.");
      return;
    }
    setSubmitting(true);
    try {
      if (stepIndex === 0) {
        if (lat === null || lng === null || !address.trim()) {
          setError("Drop a pin and enter an address before continuing.");
          setSubmitting(false);
          return;
        }
        await updateListing(draftId, { latitude: lat, longitude: lng, address }, token);
        handleIndexChange(1);
      } else if (stepIndex === 1) {
        await updateListing(draftId, { price_cents: Math.round(priceRM * 100), price_unit: priceUnit }, token);
        handleIndexChange(2);
      } else if (stepIndex === 2) {
        if (files.length === 0 && uploadedPhotoCount === 0) {
          setError("Add at least one photo before continuing.");
          setSubmitting(false);
          return;
        }
        await updateListing(draftId, { access_rules: accessRules, prohibited_items: prohibitedItems }, token);
        for (const file of files) {
          await addListingPhoto(draftId, file, token);
        }
        setUploadedPhotoCount((n) => n + files.length);
        setFiles([]);
        handleIndexChange(3);
      } else {
        const published = await publishListing(draftId, token);
        router.push(`/listings/${published.id}`);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!draft) return null;

  return (
    <div>
      {error && (
        <p role="alert" style={{ textAlign: "center", padding: "8px 24px 0" }}>
          {error}
        </p>
      )}
      <WizardShell
        steps={[
          <LocationStep
            key="location"
            lat={lat}
            lng={lng}
            address={address}
            onLatLngChange={(la, ln) => {
              setLat(la);
              setLng(ln);
            }}
            onAddressChange={setAddress}
          />,
          <PricingStep
            key="pricing"
            priceRM={priceRM}
            priceUnit={priceUnit}
            onPriceChange={setPriceRM}
            onUnitChange={setPriceUnit}
          />,
          <RulesPhotosStep
            key="rules-photos"
            accessRules={accessRules}
            prohibitedItems={prohibitedItems}
            files={files}
            onAccessRulesChange={setAccessRules}
            onProhibitedItemsChange={setProhibitedItems}
            onFilesChange={setFiles}
          />,
          <ReviewStep
            key="review"
            category={draft.category}
            title={draft.title}
            sizeSqft={draft.size_sqft}
            address={address}
            priceRM={priceRM}
            priceUnit={priceUnit}
            photoCount={uploadedPhotoCount + files.length}
            onEditStep={handleIndexChange}
            publishing={submitting}
            error={null}
          />,
        ]}
        stepIndex={stepIndex}
        globalStepIndex={stepIndex + 2}
        globalStepCount={6}
        category={draft.category}
        onIndexChange={handleIndexChange}
        onNext={handleNext}
        nextLabel={submitting ? "Saving…" : stepIndex === 3 ? "Publish" : "Continue →"}
      />
    </div>
  );
}
```

- [ ] **Step 2: Write `app/listings/new/[draftId]/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { NavBar } from "@/components/layout/NavBar";
import { DraftWizard } from "@/components/listings/wizard/DraftWizard";

export default async function DraftListingPage({ params }: { params: { draftId: string } }) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  const draftId = Number(params.draftId);
  if (!Number.isInteger(draftId)) {
    redirect("/listings/new");
  }

  return (
    <div>
      <NavBar variant="app" />
      <DraftWizard draftId={draftId} />
    </div>
  );
}
```

Ownership/not-found handling for `draftId` happens inside `DraftWizard`'s `getListing` call — `GET /listings/:id/` already 404s for anyone but the owner on a non-active listing (existing `findListingForRequest` logic in `backend/src/routes/listings.ts`), which surfaces as a thrown error in `apiFetch` and is caught by `DraftWizard`'s own error state on the next action; a fully polished "this draft isn't yours" empty state is a reasonable follow-up but out of scope here (see spec's Out of scope section — the spec doesn't call for it, so this plan doesn't invent it).

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual end-to-end check**

Run: `cd frontend && npm run dev` and `cd backend && npm run dev` (separate terminals). As a verified demo user:

1. Visit `/listings/new`, pick a category, watch the illustration crossfade and the mascot switch props each step.
2. Fill Basics, continue — confirm redirect to `/listings/new/<id>?step=location`.
3. Click the map to drop a pin, fill address, continue.
4. Drag the price slider, pick Daily/Monthly, continue.
5. Add 2+ photos, drag to reorder, continue — confirm `POST /:id/photos/` fires once per file (check Network tab or backend logs).
6. On Review, click an "Edit" link, confirm it jumps back to that step with previously-entered values intact.
7. Publish — confirm redirect to `/listings/<id>` and that the listing is now live (visit `/listings` and see it in the active list).
8. Reload `/listings/new` mid-flow (after step 2 completes) — confirm the "Continue where you left off?" prompt appears with the right title, and "Continue draft" lands back at the correct step.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/listings/wizard/DraftWizard.tsx "frontend/app/listings/new/[draftId]/page.tsx"
git commit -m "feat(frontend): DraftWizard steps 3-6 + resumable draft route

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Final check

- [ ] Run the full backend suite: `cd backend && npm test` — expect PASS.
- [ ] Run the full frontend typecheck: `cd frontend && npx tsc --noEmit` — expect zero errors.
- [ ] Run `cd frontend && npm run build` — expect a clean production build (catches anything `tsc --noEmit` alone wouldn't, e.g. an invalid dynamic import).
