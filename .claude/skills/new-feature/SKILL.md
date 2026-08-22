---
name: new-feature
description: Use when adding a new full-stack feature that needs a Django API endpoint AND a Next.js frontend piece (e.g. "add the ability for hosts to pause a listing", "let renters filter by category"). Keeps backend and frontend conventions consistent instead of re-deriving the pattern each time.
---

# Adding a full-stack feature

Follow this order — backend first, verified independently, before touching the frontend.

## 1. Backend (Django + DRF)

1. Identify which app the feature belongs to (`users`, `listings`, `bookings`,
   `payments`, `reviews`). If it doesn't fit an existing app, ask before
   creating a new one.
2. Model changes: update `models.py`, then
   `python manage.py makemigrations <app> --name <descriptive_name>`.
   Never hand-edit generated migrations.
3. Serializer: add/update in `serializers.py`. Validation logic (e.g. "listing
   must be verified before it can be booked") lives here, not in the view.
4. View: extend the relevant `ViewSet` in `views.py`. Keep views thin —
   business logic belongs in serializers or a `services.py` module if it's
   complex enough to need one (e.g. escrow release logic).
5. URL: register on the existing router in `urls.py` — don't hand-write new
   path patterns unless the endpoint doesn't fit REST conventions.
6. Write a test in `tests.py` covering the happy path and at least one
   permission/validation failure case.
7. Run `python manage.py test <app>` and confirm green before moving on.

## 2. Frontend (Next.js)

1. Add the API call in `frontend/lib/api/<domain>.ts` — typed request/response,
   matching the DRF serializer fields exactly.
2. Server Component by default. Only mark `'use client'` if the feature needs
   interactivity (forms, live filters, optimistic updates).
3. Match existing component patterns in `frontend/components/<domain>/` rather
   than introducing a new structure.
4. If the feature touches money, dates, or availability, double check units
   and timezones against what the backend actually returns — don't assume.

## 3. Before calling it done
- Confirm the feature respects the business rules in `CLAUDE.md` (escrow
  timing, verification gates, guarantee cap, no logistics features).
- Confirm backend tests pass.
- Manually note any new environment variables needed (Curlec keys, R2
  credentials, etc.) in a comment for the user — don't assume they're set.
