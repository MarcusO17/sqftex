# sqftex

Microwarehousing marketplace — Malaysia launch. See `docs/PRD.md` for the
product spec and `CLAUDE.md` for stack/conventions.

## Local development

Requires Docker Desktop (the backend runs containerized — see
`docs/superpowers/plans/2026-08-23-foundations-listing-slice.md` for why).

```bash
cp backend/.env.example backend/.env   # fill in Clerk/admin values
docker-compose up
```

`docker-compose.yml` includes a local Garage instance (`garage/garage.toml`) as an
S3-compatible stand-in for Cloudflare R2, so listing-photo uploads work without
real R2 credentials — `.env.example`'s `R2_*` defaults already point at it.
Swap in real R2 credentials only when testing against the actual production
storage.

Backend: <http://localhost:8000>. Frontend (run separately):

```bash
cd frontend
npm install
npm run dev
```

Frontend: <http://localhost:3000>.

## Deployment (Railway)

Two Railway services, deployed from this repo:

- **Backend** (`backend/`): Django + gunicorn, via `backend/Procfile`.
  Needs a managed Postgres instance with the PostGIS extension enabled.
- **Frontend** (`frontend/`): Next.js, auto-detected by Nixpacks.

### Backend environment variables

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Django secret key (generate a real one for production, never reuse the local dev value) |
| `DEBUG` | Must be `False` in production |
| `DATABASE_URL` | `postgis://user:pass@host:5432/dbname` — Railway's managed Postgres, PostGIS extension enabled |
| `ALLOWED_HOSTS` | Backend's public Railway domain |
| `CORS_ALLOWED_ORIGINS` | Frontend's public Railway domain (with scheme, no trailing slash) |
| `CSRF_TRUSTED_ORIGINS` | Same as `CORS_ALLOWED_ORIGINS` |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare R2 API credentials |
| `R2_BUCKET_NAME` | R2 bucket for listing photos + NRIC uploads |
| `R2_ENDPOINT_URL` | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_PUBLIC_BASE_URL` | Public CDN domain for the `public/` prefix (listing photos only — NRIC uploads stay private, never expose this for the `private/` prefix) |

### Frontend environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend's public Railway domain |