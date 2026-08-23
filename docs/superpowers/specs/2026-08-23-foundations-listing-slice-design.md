# Design: v1 Foundations + First Vertical Slice (Listing Create → Public View)

**Date:** 2026-08-23
**Status:** Approved for planning
**Branch:** `feature/v1-foundations-listing-slice`

## 1. Purpose & Scope

Establish the buildable skeleton of the platform — repo scaffolding, core
data models, auth/verification, deployment shape — and prove it end-to-end
with one real vertical slice: **a host can sign up, get ID-verified, and
create a listing; a renter (or anyone) can view it publicly.**

Explicitly out of scope for this spec (each gets its own future
brainstorm → spec → plan cycle):
- Search/filter over listings (the geo column is added now so it isn't a
  costly retrofit later, but no search endpoint is built this round)
- Booking, payment capture, escrow, payouts, commission
- In-app messaging
- Host dashboard
- Reviews/ratings
- Guarantee claims

This keeps the slice small enough to plan and implement as one unit, while
front-loading the infrastructure decisions (data model shapes, auth
strategy, deployment topology) that every later slice builds on top of.

## 2. Repo Scaffolding

- `backend/`: Django project (`config/`) per `CLAUDE.md`'s layout. Apps
  created now: `users`, `listings`. `bookings`, `payments`, `reviews` are
  **not** scaffolded yet — empty Django apps with no models add nothing
  until the slice that needs them (YAGNI).
- `frontend/`: Next.js App Router + TypeScript, per `CLAUDE.md`'s layout
  (`/app`, `/components`, `/lib`).
- `docker-compose.yml` at repo root: local Postgres+PostGIS and Redis for
  dev parity with Railway. Redis is provisioned but unused this slice —
  included now so Celery (needed for the booking/escrow slice) doesn't
  require infra churn later.

## 3. Data Models

### `users` app
- `User` (extends Django `AbstractUser`, email as the login identifier via
  django-allauth). Both hosts and renters are the same `User` model — the
  PRD doesn't require strict role separation, a user can list space and
  rent space.
- `IdentityVerification`: `user` FK, `nric_photo` (stored on R2 via
  django-storages), `status` (`pending` / `approved` / `rejected`),
  `reviewed_by` FK to `User` (admin/staff), `reviewed_at`, `notes`.
  `User.is_verified` is a derived/denormalized boolean, flipped when an
  `IdentityVerification` is approved via Django admin action.

### `listings` app
- `Listing`: `owner` FK to `User`, `title`, `description`, `category`
  (choices field — self-categorized per PRD), `size_sqft`, `price_cents`
  (integer, MYR sen — never floats, per `CLAUDE.md`), `price_unit`
  (`daily` / `monthly`), `location` as a **PostGIS `PointField`**, `address`
  (text), `access_rules` (text), `prohibited_items` (text), `status`
  (`draft` / `active`), `created_at`, `updated_at`.
  - The `location` field uses a real PostGIS `PointField` now, even though
    no search/geo-query is built this slice. Retrofitting a geo column onto
    an existing table later is more disruptive than adding it unused today.
- `ListingPhoto`: `listing` FK, `image` (R2), `order` (int, for display
  ordering).

## 4. Auth & Verification

- django-allauth for signup/login, email + password. Session-cookie auth
  (not JWT) — this is the simplest fit for Next.js Server Components, which
  can forward the session cookie on fetch without token-refresh plumbing.
  JWT/token auth can be revisited if a future slice needs it (e.g. a mobile
  client).
- Verification flow: authenticated user uploads an NRIC photo via
  `POST /api/v1/users/verification/`, creating a `pending`
  `IdentityVerification`. Staff review and approve/reject via a Django
  admin action (no 3rd-party KYC vendor for v1, per `CLAUDE.md`). Approval
  sets `User.is_verified = True`.
- The verification gate is enforced **explicitly in the serializer layer**,
  not just via permission classes: `ListingSerializer.create` checks
  `request.user.is_verified` and rejects with a clear error if false. This
  matches the explicit-check rule already established for bookings in the
  `booking-payment-flow` skill, applied here to listings.

## 5. API Surface (`/api/v1/`, DRF ViewSets + routers)

- `users/`
  - `register/`, `login/`, `logout/` (allauth-backed)
  - `me/` — current user profile + verification status
  - `verification/` — upload NRIC photo, create pending verification
- `listings/` (`ListingViewSet`)
  - `list` / `retrieve` — public, unauthenticated access allowed (anyone
    can browse)
  - `create` / `update` / `destroy` — authenticated, owner-only, and
    blocked unless `is_verified` (see §4)
  - Publish rule: a listing can only move from `draft` → `active` if it has
    at least one `ListingPhoto`

Views stay thin per `CLAUDE.md` convention — the verification check and
publish-gating logic live in the serializer.

## 6. Frontend

- `/listings` — Server Component, fetches and renders the public listing
  list.
- `/listings/[id]` — Server Component, listing detail view.
- `/listings/new` — Client Component (form + file upload for photos).
  Requires an authenticated + verified session; unverified/anonymous users
  are redirected with a message explaining the verification requirement.
- `lib/api/listings.ts`, `lib/api/users.ts` — typed API clients whose
  request/response types match the DRF serializer fields exactly (per
  `new-feature` skill convention).

## 7. Deployment / Infra

- Railway: two services (backend, frontend). Managed Postgres with the
  PostGIS extension enabled. Redis provisioned (idle this slice).
- Cloudflare R2 bucket + `django-storages` config for listing photos and
  NRIC verification photos (separate access rules — NRIC photos must not
  be publicly readable; listing photos are public).
- New environment variables introduced this slice (to be called out again
  as inline comments when implemented, per `new-feature` skill): R2
  credentials/bucket name, Postgres connection string with PostGIS,
  Django `SECRET_KEY`, allauth email backend config.

## 8. Testing

Backend (`python manage.py test`):
- Listing `create` is blocked with a clear error when `is_verified` is
  False (permission/validation test).
- Listing `list`/`retrieve` are publicly accessible without auth.
- A listing cannot move to `active` status without at least one photo.
- Approving an `IdentityVerification` via the admin action flips
  `User.is_verified` to `True`.

No frontend test scaffolding is introduced this slice — not an existing
`CLAUDE.md` convention, so it's left out unless requested.

## 9. Explicit Non-Goals (reiterated)

Per `CLAUDE.md`'s out-of-scope list and this spec's own scope cut: no
delivery/logistics features, no booking/payment/escrow logic, no search,
no messaging, no dashboard, no reviews. These follow in later
brainstorm → spec → plan cycles once this foundation lands.
