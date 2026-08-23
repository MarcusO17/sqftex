# Backend migration: Django/DRF → Express/Prisma/AdminJS/Clerk

Status: approved (chat), pending final spec review
Date: 2026-08-23

## Why

The team prefers Express + AdminJS + Prisma over Django + DRF. This is a
full replacement of `/backend`, not a rewrite-in-place — same product
behavior (users app + listings app, as they exist today), new stack.

## Scope

In scope: everything currently implemented — `users` app (accounts,
NRIC verification, admin review) and `listings` app (CRUD, publish gate,
photos). Out of scope: `bookings`/`payments`/`reviews` apps — they don't
exist yet in the Django codebase either, so there's nothing to migrate;
they'll be built directly on the new stack when that work starts.

## Decisions made during brainstorming

1. **Auth: Clerk**, not hand-rolled sessions. This is a deliberate
   departure from "zero frontend changes" — the frontend's login/register
   pages and API client's auth handling change to use Clerk's SDK. Traded
   off explicitly: less auth code to write/maintain vs. a wider migration
   footprint.
2. **Geo: plain `lat`/`lng` floats**, no PostGIS. Prisma has no native
   GIS type; keeping PostGIS would mean modeling location as
   `Unsupported("geography(...)")` and hand-writing raw SQL for every geo
   query. Traded off explicitly: simpler, fully type-safe schema vs.
   losing built-in spatial indexing for a radius-search feature that
   doesn't exist yet. `docker-compose.yml`'s `db` image drops from
   `postgis/postgis:16-3.4` to plain `postgres:16`.
3. **Data: fresh start.** Existing Postgres rows (including the demo data
   seeded moments before this migration) are not carried over — different
   ORM, and Django's password hashes aren't meaningful once Clerk owns
   credentials. Tables are dropped/recreated via Prisma migrations.
4. **IDs stay integers** (`Int @id @default(autoincrement())`), not
   Clerk-style opaque strings — preserves the frontend's existing
   `Listing.id: number` / `Listing.owner: number` types unchanged, even
   though the auth endpoints themselves are changing.
5. **Listings API contract preserved exactly**: same routes, same
   snake_case JSON field names, same permission behavior. Only the
   `/api/v1/users/auth/*` endpoints are removed (Clerk replaces them) —
   `/me/`, `/verification/`, and all of `/api/v1/listings/...` keep their
   current shape.

## Architecture

- **Language/runtime**: TypeScript, Node 20.
- **Framework**: Express.
- **ORM**: Prisma (Postgres).
- **Auth**: `@clerk/express` middleware verifies a Bearer session token
  on each request. A local `User` row is looked up or lazily
  created/updated (`prisma.user.upsert`, keyed on `clerkUserId`) on first
  authenticated request per user — this is where `isVerified` and
  listing ownership live, since Clerk only owns identity, not our
  domain data.
- **Admin**: AdminJS (`@adminjs/express` + `@adminjs/prisma`) mounted at
  `/admin`, with its own env-configured single-operator login
  (`ADMIN_EMAIL`/`ADMIN_PASSWORD`), independent of Clerk. Resources:
  `User`, `Listing`, `ListingPhoto`, `IdentityVerification` (with an
  Approve/Reject action setting `status`/`reviewedById`/`reviewedAt`).
- **File storage**: Cloudflare R2 via `@aws-sdk/client-s3`, uploads
  parsed with `multer` (memory storage). Listing photos → public prefix,
  stored as a direct public URL. NRIC photos → private prefix, no stored
  public URL; AdminJS generates a short-lived presigned GET URL on
  demand when an admin opens a verification record.
- **Testing**: Jest + supertest.
- **Dev/build**: `tsx` for hot-reload dev server, `tsc` for production
  build.

## Data model

```prisma
model User {
  id            Int      @id @default(autoincrement())
  clerkUserId   String   @unique
  email         String   @unique
  username      String?
  isVerified    Boolean  @default(false)
  createdAt     DateTime @default(now())

  listings              Listing[]
  verifications         IdentityVerification[] @relation("Verified")
  reviewedVerifications IdentityVerification[] @relation("Reviewer")
}

model IdentityVerification {
  id           Int      @id @default(autoincrement())
  userId       Int
  user         User     @relation("Verified", fields: [userId], references: [id], onDelete: Cascade)
  nricPhotoUrl String
  status       VerificationStatus @default(PENDING)
  reviewedById Int?
  reviewedBy   User?    @relation("Reviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  reviewedAt   DateTime?
  notes        String   @default("")
  createdAt    DateTime @default(now())
}
enum VerificationStatus { pending approved rejected }

model Listing {
  id              Int      @id @default(autoincrement())
  ownerId         Int
  owner           User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  title           String
  description     String
  category        ListingCategory
  sizeSqft        Int
  priceCents      Int
  priceUnit       PriceUnit
  lat             Float
  lng             Float
  address         String
  accessRules     String   @default("")
  prohibitedItems String   @default("")
  status          ListingStatus @default(DRAFT)
  photos          ListingPhoto[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
enum ListingCategory { spare_room garage shoplot_back_room warehouse_bay other }
enum PriceUnit { daily monthly }
enum ListingStatus { draft active }

model ListingPhoto {
  id        Int     @id @default(autoincrement())
  listingId Int
  listing   Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  imageUrl  String
  order     Int     @default(0)
}
```

Route handlers translate these camelCase Prisma fields to the exact
snake_case JSON keys the frontend already expects (`size_sqft`,
`price_cents`, `location_lat`, `location_lng`, photo `image`, etc.) — the
same job DRF's serializers were doing.

Enum values are lowercase snake_case (`spare_room`, `daily`, `active`,
`pending`, ...), matching Django's `TextChoices` values exactly — the
frontend hardcodes these strings directly (e.g.
`frontend/lib/listingCategories.ts`), so this isn't cosmetic, it's part
of the contract.

## Routes

Removed (Clerk's frontend SDK replaces these — no backend equivalent):
`POST /api/v1/users/auth/{csrf,register,login,logout}/`.

Kept, same paths and behavior, now Clerk-gated instead of session-gated:

| Route | Behavior |
|---|---|
| `GET /api/v1/users/me/` | requires auth; returns `{id, email, username, is_verified}` |
| `POST /api/v1/users/verification/` | requires auth; 400 if a PENDING verification already exists |
| `GET /api/v1/listings/` | anonymous → active only; authenticated → active + own (any status) |
| `POST /api/v1/listings/` | requires auth **and** `isVerified` (400 otherwise) |
| `GET /api/v1/listings/:id/` | active, or owner viewing their own |
| `PATCH /api/v1/listings/:id/` | owner only |
| `DELETE /api/v1/listings/:id/` | owner only |
| `POST /api/v1/listings/:id/photos/` | owner only, multipart |
| `POST /api/v1/listings/:id/publish/` | owner only; 400 if no photos; sets status → ACTIVE |

## Frontend changes required

- `frontend/app/login` (and a new sign-up surface) replaced with Clerk's
  components/hooks.
- `frontend/lib/api/client.ts` drops the CSRF-cookie dance; attaches a
  Clerk session token (`Authorization: Bearer ...`) to requests instead.
- Root layout wraps the app in `<ClerkProvider>`.

## Deployment

New `backend/Dockerfile` (`node:20-alpine`, `npm ci`, `prisma generate`,
`tsc`, `node dist/server.js`), new `Procfile` web command. Env vars: keep
`DATABASE_URL`/`R2_*` names; drop `SECRET_KEY`; add `CLERK_SECRET_KEY`,
`CLERK_PUBLISHABLE_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

## Seed data

Dummy accounts can no longer be inserted directly — Clerk owns
credentials. The new seed script uses `@clerk/backend`'s
`clerkClient.users.createUser()` to create the demo accounts in Clerk,
then upserts the matching local `User` rows (`isVerified`, listings) —
same account roster as before (verified hosts, a pending-verification
host, verified renters).

## Docs to update

`CLAUDE.md`'s stack section, repo layout, and Commands section (npm
scripts replace `manage.py` commands).

## Prerequisites before implementation can run end-to-end

A real Clerk application (publishable + secret key) is needed to test
auth locally. The code can be written against `@clerk/express` /
`@clerk/backend` regardless, but login/signup and the seed script won't
functionally work until those keys exist in `backend/.env`.

## Out of scope for this migration

Everything already out of scope for v1 per `CLAUDE.md` (delivery
integration, insurance underwriting, host CRM, multi-country), plus:
Celery→BullMQ (no background jobs exist yet to migrate), any change to
`bookings`/`payments`/`reviews` (not built yet).
