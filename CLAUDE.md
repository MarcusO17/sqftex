# Project: [Name TBD] — Microwarehousing Marketplace

## What this is
A two-sided marketplace connecting Space Owners ("hosts") with spare space to
Space Seekers ("renters", mostly SMEs + individuals) who need short/mid-term
storage. Malaysia launch. Asset-light — no in-house logistics fleet.

Full business spec: see `docs/PRD.md`.

## Stack
- **Backend**: Django + Django REST Framework, Python
- **Frontend**: Next.js (React + TypeScript), App Router
- **Database**: PostgreSQL + PostGIS (for location/geo search)
- **Auth**: django-allauth + custom NRIC verification step (manually reviewed
  via Django admin for v1 — no 3rd-party KYC vendor yet)
- **Payments**: Curlec (Razorpay Malaysia) — FPX support, escrow-style hold
  until move-in confirmed
- **File storage**: Cloudflare R2 via django-storages
- **Background jobs**: Celery + Redis (escrow release, payout scheduling,
  booking reminders)
- **Hosting**: Railway

## Repo layout
```
/backend          Django project (DRF API only, no server-rendered templates
                   except /admin)
  /apps
    /users         Auth, profiles, NRIC verification
    /listings      Space listings, categories, photos
    /bookings      Booking lifecycle, availability
    /payments      Curlec integration, escrow, payouts, commission
    /reviews       Ratings/reviews post-rental
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
- Backend tests: `cd backend && python manage.py test`
- Backend dev server: `cd backend && python manage.py runserver`
- Frontend dev server: `cd frontend && npm run dev`
- Migrations: `cd backend && python manage.py makemigrations && python manage.py migrate`

## Out of scope for v1 (don't build unless asked)
- Delivery/logistics partner integration
- Full insurance underwriting
- Host CRM automation, recurring bookings
- Multi-country support
