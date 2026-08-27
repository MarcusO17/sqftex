# Project: packrat — Microwarehousing Marketplace

## What this is
A two-sided marketplace connecting Space Owners ("hosts") with spare space to
Space Seekers ("renters", mostly SMEs + individuals) who need short/mid-term
storage. Malaysia launch. Asset-light — no in-house logistics fleet.

Full business spec: see `docs/PRD.md`.

## Stack
- **Backend**: Express + TypeScript, Prisma ORM
- **Backend auth**: Clerk (identity) + a local `User` row keyed by `clerkUserId` for domain data
  (verification status, listing ownership)
- **Admin panel**: AdminJS (replaces Django admin) — NRIC verification review, single
  env-configured operator login
- **Frontend**: Next.js (React + TypeScript), App Router
- **Database**: PostgreSQL (plain `lat`/`lng` floats on `Listing`, no PostGIS — Prisma has no
  native GIS type; radius/geo search, if built later, does the math in application code)
- **Auth**: Clerk, plus a custom NRIC verification step (manually reviewed via AdminJS for v1 —
  no 3rd-party KYC vendor yet)
- **Payments**: Curlec (Razorpay Malaysia) — FPX support, escrow-style hold
  until move-in confirmed
- **File storage**: Cloudflare R2 via django-storages
- **Background jobs**: Celery + Redis (escrow release, payout scheduling,
  booking reminders)
- **Hosting**: Railway

## Repo layout
```
/backend          Express + TypeScript API (Prisma ORM, AdminJS at /admin)
  /src
    /routes        Express routers (users, listings; bookings/payments/reviews
                    land here when those apps are built)
    /middleware     Clerk auth middleware
    /serializers    Prisma row -> API JSON mappers
    /storage        R2 (S3-compatible) upload helpers
    /admin          AdminJS resource/config
  /prisma           schema.prisma + migrations
  /scripts          seed.ts (demo accounts + listings)
/frontend          Next.js app
  /app             App Router pages
  /components
  /lib             API client, hooks
/docs
  PRD.md           Full product spec
```

## Conventions
- Backend: one Django app per bounded domain (see layout above). Every model
  change goes through a migration — never hand-edit migration files.
- API: DRF ViewSets + routers, versioned under `/api/v1/`. Serializers do
  validation; views stay thin.
- Frontend: Server Components by default; Client Components only where
  interactivity is needed (booking forms, messaging, filters).
- Money: all amounts stored as integer cents (MYR sen), never floats.
- Commission is calculated and stored at booking time, not recalculated later
  — protects against rate changes affecting historical bookings.

## Business rules Claude should always respect
- **Escrow**: payment is captured at booking but not released to host until
  move-in is confirmed by the renter (or an auto-confirm window elapses).
- **Guarantee cap**: platform damage/loss guarantee is capped per claim (see
  PRD for the current cap amount) — never build a claims flow that implies
  unlimited coverage.
- **Access model**: v1 is "visiting" only (renter/host coordinate direct
  access). Do not build delivery/logistics features unless explicitly asked —
  that's a planned v1.5 addition, not current scope.
- **Verification gate**: a listing cannot go live, and a booking cannot be
  made, until the relevant party has completed ID verification.

## Commands
- Backend tests: `cd backend && npm test`
- Backend dev server: `cd backend && npm run dev` (also always starts Prisma Studio at http://localhost:5555; `npm run dev:server` runs just the API without it)
- Frontend dev server: `cd frontend && npm run dev`
- Migrations: `cd backend && npx prisma migrate dev --name <description>`
- Seed demo data: `cd backend && npm run seed` (add `-- --flush` to wipe and re-seed)

## Out of scope for v1 (don't build unless asked)
- Delivery/logistics partner integration
- Full insurance underwriting
- Host CRM automation, recurring bookings
- Multi-country support
