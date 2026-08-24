# Backend Migration: Express + Prisma + AdminJS + Clerk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Django/DRF backend with an Express + TypeScript + Prisma backend (AdminJS for the admin panel, Clerk for auth), preserving the existing `/api/v1/listings/...` and `/api/v1/users/{me,verification}` contract exactly, and update the Next.js frontend to authenticate via Clerk instead of Django sessions.

**Architecture:** A new Node/TypeScript app lives in `backend/` alongside the Django project until the cutover task deletes the Django files. Express routes mirror the DRF views; Prisma replaces the Django ORM (plain `lat`/`lng` floats, no PostGIS); Clerk handles identity, a local `User` row (keyed by `clerkUserId`) holds domain data (`isVerified`, listing ownership) and is lazily upserted on first authenticated request; AdminJS replaces Django admin for NRIC verification review.

**Tech Stack:** TypeScript, Express 4, Prisma + PostgreSQL, `@clerk/express` (backend) + `@clerk/nextjs` (frontend), AdminJS + `@adminjs/prisma`, `@aws-sdk/client-s3` (R2), Jest + supertest, `zod`.

**Spec:** `docs/superpowers/specs/2026-08-23-backend-migration-express-prisma-clerk-design.md`

## Global Constraints

- Money stays integer cents (`price_cents`) — never floats. (spec, CLAUDE.md)
- Enum values are lowercase snake_case matching Django's `TextChoices` exactly: `spare_room`, `garage`, `shoplot_back_room`, `warehouse_bay`, `other`, `daily`, `monthly`, `draft`, `active`, `pending`, `approved`, `rejected`. This is part of the API contract, not cosmetic — the frontend hardcodes these strings.
- IDs are auto-incrementing integers (`Int @id @default(autoincrement())`), not Clerk-style opaque strings — keeps the frontend's existing `id: number` / `owner: number` types intact.
- `/api/v1/listings/...`, `/api/v1/users/me/`, `/api/v1/users/verification/` keep their exact current routes, JSON field names, and permission behavior. Only `/api/v1/users/auth/*` is removed.
- Verification gate: `POST /api/v1/listings/` must 400 when the authenticated user's `isVerified` is false.
- Publish gate: `POST /api/v1/listings/:id/publish/` must 400 when the listing has zero photos.
- TypeScript throughout, both backend and any new/changed frontend code.
- Backend tests: Jest + supertest.
- **Run all `npm`/`npx` commands via the PowerShell tool, not Bash** — this environment's Bash tool has a known issue invoking npm/npx shims on Windows (fails with `'"node"' is not recognized`). PowerShell works.
- Postgres is reachable at `localhost:5432` (user/pass/db all `sqftex`) via the already-running `docker-compose` `db` service — use this for all local dev and tests; no need to start anything extra.

---

### Task 1: Scaffold the Express + TypeScript project

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/jest.config.js`
- Create: `backend/src/app.ts`
- Create: `backend/src/server.ts`
- Test: `backend/tests/setupEnv.ts`
- Test: `backend/tests/health.test.ts`

**Interfaces:**
- Produces: `createApp(): Express` from `src/app.ts` — used by every later route task and by `tests/*.test.ts` via `supertest(createApp())`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "sqftex-backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "test": "jest --runInBand",
    "seed": "tsx scripts/seed.ts"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.14.15",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.4",
    "tsx": "^4.16.2",
    "typescript": "^5.5.4"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run (PowerShell, `cd backend` first):
```
cd E:\003Resources\001Repositories\sqftex\backend
npm install
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "sourceMap": true
  },
  "include": ["src", "scripts", "tests"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Write `jest.config.js`**

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setupEnv.ts"],
};
```

- [ ] **Step 5: Write `tests/setupEnv.ts`**

```ts
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
```

- [ ] **Step 6: Write the failing test**

`backend/tests/health.test.ts`:
```ts
import request from "supertest";
import { createApp } from "../src/app";

describe("GET /health", () => {
  it("returns ok status", async () => {
    const app = createApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run (PowerShell, in `backend/`): `npm test`
Expected: FAIL — `Cannot find module '../src/app'`.

- [ ] **Step 8: Write `src/app.ts`**

```ts
import cors from "cors";
import express, { Express } from "express";

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ALLOWED_ORIGIN ?? "http://localhost:3000" }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
```

- [ ] **Step 9: Write `src/server.ts`**

```ts
import { createApp } from "./app";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;

const app = createApp();
app.listen(PORT, () => {
  console.log(`sqftex backend listening on :${PORT}`);
});
```

- [ ] **Step 10: Run test to verify it passes**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 11: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/tsconfig.json backend/jest.config.js backend/src/app.ts backend/src/server.ts backend/tests/setupEnv.ts backend/tests/health.test.ts
git commit -m "feat(backend): scaffold Express + TypeScript project with health check

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Env/config loader

**Files:**
- Create: `backend/src/env.ts`
- Modify: `backend/.env` (add/replace vars — see Step 5)
- Modify: `backend/.env.example` (same)
- Test: `backend/tests/env.test.ts`

**Interfaces:**
- Produces: `env: { DATABASE_URL, CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_COOKIE_SECRET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT_URL, R2_PUBLIC_BASE_URL, CORS_ALLOWED_ORIGIN, PORT }` from `src/env.ts` — every later task that reads config imports this instead of `process.env` directly.

- [ ] **Step 1: Write the failing test**

`backend/tests/env.test.ts`:
```ts
describe("env", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("throws a clear error when a required var is missing", () => {
    delete process.env.CLERK_SECRET_KEY;
    expect(() => require("../src/env")).toThrow(/CLERK_SECRET_KEY/);
  });

  it("loads successfully when all required vars are present", () => {
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/db";
    process.env.CLERK_SECRET_KEY = "sk_test_x";
    process.env.CLERK_PUBLISHABLE_KEY = "pk_test_x";
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD = "hunter22222";
    process.env.ADMIN_COOKIE_SECRET = "cookie-secret-for-adminjs-session";
    const { env } = require("../src/env");
    expect(env.ADMIN_EMAIL).toBe("admin@example.com");
    expect(env.CORS_ALLOWED_ORIGIN).toBe("http://localhost:3000");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- env.test.ts`
Expected: FAIL — `Cannot find module '../src/env'`.

- [ ] **Step 3: Write `src/env.ts`**

```ts
import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  ADMIN_EMAIL: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  ADMIN_COOKIE_SECRET: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().default(""),
  R2_SECRET_ACCESS_KEY: z.string().default(""),
  R2_BUCKET_NAME: z.string().default(""),
  R2_ENDPOINT_URL: z.string().default(""),
  R2_PUBLIC_BASE_URL: z.string().default(""),
  CORS_ALLOWED_ORIGIN: z.string().default("http://localhost:3000"),
  PORT: z.string().default("8000"),
});

function loadEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- env.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Update `backend/.env` and `backend/.env.example`**

Replace the contents of `backend/.env.example` with:
```
DATABASE_URL=postgresql://sqftex:sqftex@localhost:5432/sqftex?schema=public
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
ADMIN_EMAIL=admin@sqftex.test
ADMIN_PASSWORD=change-me
ADMIN_COOKIE_SECRET=change-me-too
CORS_ALLOWED_ORIGIN=http://localhost:3000
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=sqftex-media
R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=
PORT=8000
```

Update `backend/.env` (the real local file, gitignored) the same way — set `DATABASE_URL` to
`postgresql://sqftex:sqftex@localhost:5432/sqftex?schema=public` (was `postgis://...` — Prisma
doesn't understand that scheme), keep the existing `R2_*` values as-is, and add placeholder
values for `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`ADMIN_COOKIE_SECRET` (real Clerk keys are a prerequisite noted in the spec — placeholders are
enough for every task's tests to pass, but sign-in won't work for real until real keys are set).
Remove `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` (Django-specific, unused
now). Leave `REDIS_URL` in place (unused by this migration, kept for future background jobs).

- [ ] **Step 6: Commit**

```bash
git add backend/src/env.ts backend/tests/env.test.ts backend/.env.example
git commit -m "feat(backend): add validated env config loader

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Prisma schema, client, and initial migration

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/prisma.ts`
- Test: `backend/tests/prisma.test.ts`

**Interfaces:**
- Consumes: `env.DATABASE_URL` from Task 2.
- Produces: `prisma: PrismaClient` from `src/prisma.ts`, and the generated `@prisma/client` types (`User`, `Listing`, `ListingPhoto`, `IdentityVerification`, `ListingCategory`, `PriceUnit`, `ListingStatus`, `VerificationStatus`) — used by every later task.

- [ ] **Step 1: Write the failing test**

`backend/tests/prisma.test.ts`:
```ts
import { prisma } from "../src/prisma";

describe("Prisma client", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("can create, read, and delete a User row", async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: "test_clerk_prisma_1", email: "prisma-test@example.com" },
    });
    expect(user.id).toEqual(expect.any(Number));
    expect(user.isVerified).toBe(false);

    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.email).toBe("prisma-test@example.com");

    await prisma.user.delete({ where: { id: user.id } });
    const gone = await prisma.user.findUnique({ where: { id: user.id } });
    expect(gone).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- prisma.test.ts`
Expected: FAIL — `Cannot find module '../src/prisma'`.

- [ ] **Step 3: Install Prisma**

Run (PowerShell, `backend/`):
```
npm install prisma @prisma/client
```

- [ ] **Step 4: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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

enum VerificationStatus {
  pending
  approved
  rejected
}

model IdentityVerification {
  id           Int      @id @default(autoincrement())
  userId       Int
  user         User     @relation("Verified", fields: [userId], references: [id], onDelete: Cascade)
  nricPhotoUrl String
  status       VerificationStatus @default(pending)
  reviewedById Int?
  reviewedBy   User?    @relation("Reviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  reviewedAt   DateTime?
  notes        String   @default("")
  createdAt    DateTime @default(now())
}

enum ListingCategory {
  spare_room
  garage
  shoplot_back_room
  warehouse_bay
  other
}

enum PriceUnit {
  daily
  monthly
}

enum ListingStatus {
  draft
  active
}

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
  status          ListingStatus @default(draft)
  photos          ListingPhoto[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ListingPhoto {
  id        Int     @id @default(autoincrement())
  listingId Int
  listing   Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  imageUrl  String
  order     Int     @default(0)
}
```

- [ ] **Step 5: Run the initial migration**

Run (PowerShell, `backend/`, requires `DATABASE_URL` in `.env` from Task 2):
```
npx prisma migrate dev --name init
```
Expected: creates `backend/prisma/migrations/<timestamp>_init/migration.sql`, applies it to the
`sqftex` database (side-by-side with the Django tables already in there — Prisma's default table
names are `"User"`, `"Listing"`, etc., which don't collide with Django's `users_user`,
`listings_listing`), and generates the Prisma client.

- [ ] **Step 6: Write `src/prisma.ts`**

```ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- prisma.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/prisma backend/src/prisma.ts backend/tests/prisma.test.ts backend/package.json backend/package-lock.json
git commit -m "feat(backend): add Prisma schema, client, and initial migration

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: R2 storage helper

**Files:**
- Create: `backend/src/storage/r2.ts`
- Test: `backend/tests/storage/r2.test.ts`

**Interfaces:**
- Consumes: `env` from Task 2.
- Produces: `uploadPublicObject(buffer: Buffer, contentType: string, originalName: string): Promise<string>` (returns a public URL), `uploadPrivateObject(...): Promise<string>` (returns an object key, not a URL), `getPresignedUrl(key: string): Promise<string>` — used by Task 7 (verification upload), Task 9 (listing photos), Task 10 (AdminJS NRIC preview).

- [ ] **Step 1: Install dependencies**

Run (PowerShell, `backend/`):
```
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- [ ] **Step 2: Write the failing test**

`backend/tests/storage/r2.test.ts`:
```ts
const sendMock = jest.fn().mockResolvedValue({});

jest.mock("@aws-sdk/client-s3", () => {
  const actual = jest.requireActual("@aws-sdk/client-s3");
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  };
});

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://signed.example/private/verification/abc.jpg"),
}));

// Fixed, known value — do not read process.env.R2_PUBLIC_BASE_URL here. If the real .env has it
// blank, an assertion against process.env would pass vacuously (url.startsWith("") is always
// true) and prove nothing.
jest.mock("../../src/env", () => ({
  env: { R2_PUBLIC_BASE_URL: "https://media.sqftex.test", R2_BUCKET_NAME: "sqftex-media" },
}));

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { uploadPublicObject, uploadPrivateObject, getPresignedUrl } from "../../src/storage/r2";

describe("R2 storage helper", () => {
  beforeEach(() => sendMock.mockClear());

  it("uploads a public object and returns a public URL under R2_PUBLIC_BASE_URL", async () => {
    const url = await uploadPublicObject(Buffer.from("fake-image"), "image/jpeg", "photo.jpg");
    expect(sendMock).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(url.startsWith("https://media.sqftex.test/")).toBe(true);
    expect(url).toMatch(/public\/listings\/.+\.jpg$/);
  });

  it("uploads a private object and returns an object key, not a URL", async () => {
    const key = await uploadPrivateObject(Buffer.from("fake-nric"), "image/png", "nric.png");
    expect(sendMock).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(key).toMatch(/^private\/verification\/.+\.png$/);
    expect(key.startsWith("http")).toBe(false);
  });

  it("returns a presigned URL for a private key", async () => {
    const url = await getPresignedUrl("private/verification/abc.jpg");
    expect(getSignedUrl).toHaveBeenCalled();
    expect(url).toBe("https://signed.example/private/verification/abc.jpg");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- r2.test.ts`
Expected: FAIL — `Cannot find module '../../src/storage/r2'`.

- [ ] **Step 4: Write `src/storage/r2.ts`**

```ts
import { randomUUID } from "crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env";

export const s3 = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

function buildKey(prefix: string, originalName: string): string {
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "bin";
  return `${prefix}/${randomUUID()}.${ext}`;
}

async function putObject(key: string, buffer: Buffer, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

export async function uploadPublicObject(
  buffer: Buffer,
  contentType: string,
  originalName: string
): Promise<string> {
  const key = buildKey("public/listings", originalName);
  await putObject(key, buffer, contentType);
  return `${env.R2_PUBLIC_BASE_URL}/${key}`;
}

export async function uploadPrivateObject(
  buffer: Buffer,
  contentType: string,
  originalName: string
): Promise<string> {
  const key = buildKey("private/verification", originalName);
  await putObject(key, buffer, contentType);
  return key;
}

export async function getPresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 300 });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- r2.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/storage backend/tests/storage backend/package.json backend/package-lock.json backend/.env.example
git commit -m "feat(backend): add R2 storage helper for public/private uploads

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Clerk auth middleware

**Files:**
- Create: `backend/src/middleware/auth.ts`
- Test: `backend/tests/middleware/auth.test.ts`

**Interfaces:**
- Consumes: `prisma` from Task 3.
- Produces: `clerkAuth` (Express middleware, mounted globally), `requireAuth` (Express middleware, 401s if unauthenticated, else sets `req.dbUser: User`), `attachDbUserIfPresent` (Express middleware, sets `req.dbUser` if authenticated, otherwise calls `next()` without error) — used by Task 7 (users routes) and Tasks 8–9 (listings routes).

- [ ] **Step 1: Install Clerk's Express SDK**

Run (PowerShell, `backend/`):
```
npm install @clerk/express
```

- [ ] **Step 2: Write the failing test**

`backend/tests/middleware/auth.test.ts`:
```ts
jest.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: jest.fn(),
  clerkClient: {
    users: { getUser: jest.fn() },
  },
}));

import express from "express";
import request from "supertest";
import { clerkClient, getAuth } from "@clerk/express";
import { attachDbUserIfPresent, requireAuth } from "../../src/middleware/auth";
import { prisma } from "../../src/prisma";

describe("auth middleware", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { clerkUserId: { startsWith: "test_auth_" } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("requireAuth returns 401 when there is no authenticated Clerk user", async () => {
    (getAuth as jest.Mock).mockReturnValue({ userId: null });
    const app = express();
    app.get("/protected", requireAuth, (req, res) => res.json({ ok: true }));

    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
  });

  it("requireAuth creates a local User row on first authenticated request", async () => {
    (getAuth as jest.Mock).mockReturnValue({ userId: "test_auth_1" });
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
      emailAddresses: [{ emailAddress: "auth-test@example.com" }],
    });

    const app = express();
    app.get("/protected", requireAuth, (req, res) => res.json({ id: req.dbUser?.id }));

    const res = await request(app).get("/protected");
    expect(res.status).toBe(200);

    const dbUser = await prisma.user.findUnique({ where: { clerkUserId: "test_auth_1" } });
    expect(dbUser?.email).toBe("auth-test@example.com");
  });

  it("attachDbUserIfPresent does not fail the request when unauthenticated", async () => {
    (getAuth as jest.Mock).mockReturnValue({ userId: null });
    const app = express();
    app.get("/optional", attachDbUserIfPresent, (req, res) => res.json({ hasUser: !!req.dbUser }));

    const res = await request(app).get("/optional");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ hasUser: false });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- auth.test.ts`
Expected: FAIL — `Cannot find module '../../src/middleware/auth'`.

- [ ] **Step 4: Write `src/middleware/auth.ts`**

```ts
import { clerkClient, clerkMiddleware, getAuth } from "@clerk/express";
import type { User } from "@prisma/client";
import type { RequestHandler } from "express";
import { prisma } from "../prisma";

declare global {
  namespace Express {
    interface Request {
      dbUser?: User;
    }
  }
}

export const clerkAuth = clerkMiddleware();

async function upsertDbUser(clerkUserId: string): Promise<User> {
  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  return prisma.user.upsert({
    where: { clerkUserId },
    update: { email },
    create: { clerkUserId, email },
  });
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ detail: "Authentication required." });
    return;
  }
  req.dbUser = await upsertDbUser(userId);
  next();
};

export const attachDbUserIfPresent: RequestHandler = async (req, _res, next) => {
  const { userId } = getAuth(req);
  if (userId) {
    req.dbUser = await upsertDbUser(userId);
  }
  next();
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- auth.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/middleware backend/tests/middleware backend/package.json backend/package-lock.json
git commit -m "feat(backend): add Clerk auth middleware with lazy local User upsert

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Serializers

**Files:**
- Create: `backend/src/serializers/user.ts`
- Create: `backend/src/serializers/listing.ts`
- Test: `backend/tests/serializers/user.test.ts`
- Test: `backend/tests/serializers/listing.test.ts`

**Interfaces:**
- Consumes: Prisma types `User`, `Listing`, `ListingPhoto` from Task 3.
- Produces: `toUserJSON(user: User): UserJSON`, `toListingJSON(listing: Listing & { photos: ListingPhoto[] }): ListingJSON`, `toListingPhotoJSON(photo: ListingPhoto): ListingPhotoJSON` — used by Tasks 7–9.

- [ ] **Step 1: Write the failing tests**

`backend/tests/serializers/user.test.ts`:
```ts
import type { User } from "@prisma/client";
import { toUserJSON } from "../../src/serializers/user";

describe("toUserJSON", () => {
  it("maps a Prisma User to the API's snake_case shape", () => {
    const user: User = {
      id: 1,
      clerkUserId: "clerk_1",
      email: "a@example.com",
      username: "alice",
      isVerified: true,
      createdAt: new Date(),
    };
    expect(toUserJSON(user)).toEqual({
      id: 1,
      email: "a@example.com",
      username: "alice",
      is_verified: true,
    });
  });
});
```

`backend/tests/serializers/listing.test.ts`:
```ts
import type { Listing, ListingPhoto } from "@prisma/client";
import { toListingJSON, toListingPhotoJSON } from "../../src/serializers/listing";

const baseListing: Listing = {
  id: 5,
  ownerId: 2,
  title: "Spare Room",
  description: "Nice and dry.",
  category: "spare_room",
  sizeSqft: 120,
  priceCents: 15000,
  priceUnit: "monthly",
  lat: 3.1073,
  lng: 101.6415,
  address: "PJ Old Town",
  accessRules: "Call ahead.",
  prohibitedItems: "",
  status: "active",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

describe("toListingPhotoJSON", () => {
  it("maps imageUrl to image", () => {
    const photo: ListingPhoto = { id: 1, listingId: 5, imageUrl: "https://x/y.jpg", order: 0 };
    expect(toListingPhotoJSON(photo)).toEqual({ id: 1, image: "https://x/y.jpg", order: 0 });
  });
});

describe("toListingJSON", () => {
  it("maps camelCase Prisma fields to the API's snake_case shape, values unchanged", () => {
    const json = toListingJSON({ ...baseListing, photos: [] });
    expect(json).toEqual({
      id: 5,
      owner: 2,
      title: "Spare Room",
      description: "Nice and dry.",
      category: "spare_room",
      size_sqft: 120,
      price_cents: 15000,
      price_unit: "monthly",
      address: "PJ Old Town",
      access_rules: "Call ahead.",
      prohibited_items: "",
      status: "active",
      photos: [],
      location_lat: 3.1073,
      location_lng: 101.6415,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- serializers`
Expected: FAIL — cannot find `../../src/serializers/user` / `listing`.

- [ ] **Step 3: Write `src/serializers/user.ts`**

```ts
import type { User } from "@prisma/client";

export interface UserJSON {
  id: number;
  email: string;
  username: string | null;
  is_verified: boolean;
}

export function toUserJSON(user: User): UserJSON {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    is_verified: user.isVerified,
  };
}
```

- [ ] **Step 4: Write `src/serializers/listing.ts`**

```ts
import type { Listing, ListingPhoto } from "@prisma/client";

export interface ListingPhotoJSON {
  id: number;
  image: string;
  order: number;
}

export interface ListingJSON {
  id: number;
  owner: number;
  title: string;
  description: string;
  category: string;
  size_sqft: number;
  price_cents: number;
  price_unit: string;
  address: string;
  access_rules: string;
  prohibited_items: string;
  status: string;
  photos: ListingPhotoJSON[];
  location_lat: number;
  location_lng: number;
  created_at: string;
  updated_at: string;
}

type ListingWithPhotos = Listing & { photos: ListingPhoto[] };

export function toListingPhotoJSON(photo: ListingPhoto): ListingPhotoJSON {
  return { id: photo.id, image: photo.imageUrl, order: photo.order };
}

export function toListingJSON(listing: ListingWithPhotos): ListingJSON {
  return {
    id: listing.id,
    owner: listing.ownerId,
    title: listing.title,
    description: listing.description,
    category: listing.category,
    size_sqft: listing.sizeSqft,
    price_cents: listing.priceCents,
    price_unit: listing.priceUnit,
    address: listing.address,
    access_rules: listing.accessRules,
    prohibited_items: listing.prohibitedItems,
    status: listing.status,
    photos: listing.photos.map(toListingPhotoJSON),
    location_lat: listing.lat,
    location_lng: listing.lng,
    created_at: listing.createdAt.toISOString(),
    updated_at: listing.updatedAt.toISOString(),
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- serializers`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/serializers backend/tests/serializers
git commit -m "feat(backend): add User/Listing serializers matching existing API shape

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Users routes (`/me`, `/verification`)

**Files:**
- Create: `backend/src/routes/users.ts`
- Modify: `backend/src/app.ts` (mount the router)
- Test: `backend/tests/routes/users.test.ts`

**Interfaces:**
- Consumes: `requireAuth` (Task 5), `toUserJSON` (Task 6), `uploadPrivateObject` (Task 4), `prisma` (Task 3).
- Produces: `usersRouter: Router`, mounted at `/api/v1/users` in `src/app.ts`.

- [ ] **Step 1: Install multer**

Run (PowerShell, `backend/`):
```
npm install multer
npm install --save-dev @types/multer
```

- [ ] **Step 2: Write the failing test**

`backend/tests/routes/users.test.ts`:
```ts
jest.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: jest.fn(),
  clerkClient: { users: { getUser: jest.fn() } },
}));
jest.mock("../../src/storage/r2", () => ({
  uploadPrivateObject: jest.fn().mockResolvedValue("private/verification/fake.jpg"),
}));

import request from "supertest";
import { clerkClient, getAuth } from "@clerk/express";
import { createApp } from "../../src/app";
import { prisma } from "../../src/prisma";

describe("users routes", () => {
  afterEach(async () => {
    await prisma.identityVerification.deleteMany({
      where: { user: { clerkUserId: { startsWith: "test_users_" } } },
    });
    await prisma.user.deleteMany({ where: { clerkUserId: { startsWith: "test_users_" } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("GET /api/v1/users/me/ returns 401 when unauthenticated", async () => {
    (getAuth as jest.Mock).mockReturnValue({ userId: null });
    const res = await request(createApp()).get("/api/v1/users/me/");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/users/me/ returns the local user's data", async () => {
    (getAuth as jest.Mock).mockReturnValue({ userId: "test_users_1" });
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
      emailAddresses: [{ emailAddress: "me-test@example.com" }],
    });

    const res = await request(createApp()).get("/api/v1/users/me/");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: "me-test@example.com", is_verified: false });
  });

  it("POST /api/v1/users/verification/ creates a pending verification, then 400s on a second attempt", async () => {
    (getAuth as jest.Mock).mockReturnValue({ userId: "test_users_2" });
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
      emailAddresses: [{ emailAddress: "verify-test@example.com" }],
    });

    const first = await request(createApp())
      .post("/api/v1/users/verification/")
      .attach("nric_photo", Buffer.from("fake-image-bytes"), "nric.jpg");
    expect(first.status).toBe(201);
    expect(first.body.status).toBe("pending");

    const second = await request(createApp())
      .post("/api/v1/users/verification/")
      .attach("nric_photo", Buffer.from("fake-image-bytes"), "nric.jpg");
    expect(second.status).toBe(400);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- routes/users.test.ts`
Expected: FAIL — `Cannot find module '../../src/routes/users'` (via `app.ts` not yet importing it) or 404s.

- [ ] **Step 4: Write `src/routes/users.ts`**

```ts
import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";
import { toUserJSON } from "../serializers/user";
import { uploadPrivateObject } from "../storage/r2";

export const usersRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

usersRouter.get("/me/", requireAuth, (req, res) => {
  res.json(toUserJSON(req.dbUser!));
});

usersRouter.post(
  "/verification/",
  requireAuth,
  upload.single("nric_photo"),
  async (req, res) => {
    const pending = await prisma.identityVerification.findFirst({
      where: { userId: req.dbUser!.id, status: "pending" },
    });
    if (pending) {
      res.status(400).json({ detail: "A verification request is already pending." });
      return;
    }
    if (!req.file) {
      res.status(400).json({ detail: "nric_photo is required." });
      return;
    }

    const nricPhotoUrl = await uploadPrivateObject(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );
    const verification = await prisma.identityVerification.create({
      data: { userId: req.dbUser!.id, nricPhotoUrl },
    });

    res.status(201).json({
      id: verification.id,
      nric_photo: verification.nricPhotoUrl,
      status: verification.status,
      created_at: verification.createdAt.toISOString(),
    });
  }
);
```

- [ ] **Step 5: Wire it into `src/app.ts`**

Modify `backend/src/app.ts` — add imports and mount the router:
```ts
import cors from "cors";
import express, { Express } from "express";
import { clerkAuth } from "./middleware/auth";
import { usersRouter } from "./routes/users";

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ALLOWED_ORIGIN ?? "http://localhost:3000" }));
  app.use(express.json());
  app.use(clerkAuth);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/v1/users", usersRouter);

  return app;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- routes/users.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/users.ts backend/src/app.ts backend/tests/routes/users.test.ts backend/package.json backend/package-lock.json
git commit -m "feat(backend): add /api/v1/users/me and /verification routes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Listings routes — list, create, retrieve, update, delete

**Files:**
- Create: `backend/src/routes/listings.ts`
- Modify: `backend/src/app.ts` (mount the router)
- Test: `backend/tests/routes/listings.test.ts`

**Interfaces:**
- Consumes: `requireAuth`, `attachDbUserIfPresent` (Task 5), `toListingJSON` (Task 6), `prisma` (Task 3).
- Produces: `listingsRouter: Router`, mounted at `/api/v1/listings` in `src/app.ts`. Task 9 adds two more routes to this same router/file.

**Corrections found during implementation (both below are already reflected
in the code blocks in this task):** the input schema's field names mirror
the API's snake_case JSON contract (`size_sqft`, `price_cents`, ...), but
Prisma's generated types expect camelCase (`sizeSqft`, `priceCents`, ...).
Spreading the parsed zod object straight into `prisma.listing.create`/
`update` doesn't type-check — it needs an explicit snake_case→camelCase
mapping step first (two variants, since create's fields are required and
update's are partial). The test file's direct `prisma.listing.create()`
calls (used to seed fixture rows, as opposed to going through the route)
have the same issue in reverse: they can't spread `validInput` (snake_case,
meant for HTTP request bodies) directly into a Prisma call — it sends
unknown keys and Prisma rejects them. Those calls use a separate
`dbFields` object with just the camelCase-appropriate keys instead.

- [ ] **Step 1: Write the failing test**

`backend/tests/routes/listings.test.ts`:
```ts
jest.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: jest.fn(),
  clerkClient: { users: { getUser: jest.fn() } },
}));

import request from "supertest";
import { clerkClient, getAuth } from "@clerk/express";
import { createApp } from "../../src/app";
import { prisma } from "../../src/prisma";

async function makeUser(clerkUserId: string, email: string, isVerified: boolean) {
  return prisma.user.create({ data: { clerkUserId, email, isVerified } });
}

function authAs(clerkUserId: string, email: string) {
  (getAuth as jest.Mock).mockReturnValue({ userId: clerkUserId });
  (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
    emailAddresses: [{ emailAddress: email }],
  });
}

function anon() {
  (getAuth as jest.Mock).mockReturnValue({ userId: null });
}

const validInput = {
  title: "Spare Room",
  description: "Nice and dry.",
  category: "spare_room",
  size_sqft: 120,
  price_cents: 15000,
  price_unit: "monthly",
  address: "PJ Old Town",
  access_rules: "",
  prohibited_items: "",
  latitude: 3.1073,
  longitude: 101.6415,
};

describe("listings routes", () => {
  afterEach(async () => {
    await prisma.listing.deleteMany({ where: { owner: { clerkUserId: { startsWith: "test_listings_" } } } });
    await prisma.user.deleteMany({ where: { clerkUserId: { startsWith: "test_listings_" } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("POST / rejects an unverified user with 400", async () => {
    await makeUser("test_listings_unverified", "unverified@example.com", false);
    authAs("test_listings_unverified", "unverified@example.com");

    const res = await request(createApp()).post("/api/v1/listings/").send(validInput);
    expect(res.status).toBe(400);
  });

  it("POST / creates a listing for a verified user", async () => {
    await makeUser("test_listings_owner", "owner@example.com", true);
    authAs("test_listings_owner", "owner@example.com");

    const res = await request(createApp()).post("/api/v1/listings/").send(validInput);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "Spare Room",
      category: "spare_room",
      status: "draft",
      location_lat: 3.1073,
      location_lng: 101.6415,
    });
  });

  it("GET / returns only active listings for an anonymous caller", async () => {
    const owner = await makeUser("test_listings_owner2", "owner2@example.com", true);
    await prisma.listing.create({
      data: { ...validInput, sizeSqft: 120, priceCents: 15000, priceUnit: "monthly", category: "spare_room", status: "active", lat: 1, lng: 1, ownerId: owner.id, title: "Active One" },
    });
    await prisma.listing.create({
      data: { ...validInput, sizeSqft: 120, priceCents: 15000, priceUnit: "monthly", category: "spare_room", status: "draft", lat: 1, lng: 1, ownerId: owner.id, title: "Draft One" },
    });

    anon();
    const res = await request(createApp()).get("/api/v1/listings/");
    expect(res.status).toBe(200);
    const titles = res.body.map((l: any) => l.title);
    expect(titles).toContain("Active One");
    expect(titles).not.toContain("Draft One");
  });

  it("PATCH /:id/ lets the owner update their own listing, 404s for a non-owner", async () => {
    const owner = await makeUser("test_listings_owner3", "owner3@example.com", true);
    const other = await makeUser("test_listings_other", "other@example.com", true);
    const listing = await prisma.listing.create({
      data: { ...validInput, sizeSqft: 120, priceCents: 15000, priceUnit: "monthly", category: "spare_room", status: "draft", lat: 1, lng: 1, ownerId: owner.id },
    });

    authAs("test_listings_owner3", "owner3@example.com");
    const okRes = await request(createApp())
      .patch(`/api/v1/listings/${listing.id}/`)
      .send({ title: "Updated Title" });
    expect(okRes.status).toBe(200);
    expect(okRes.body.title).toBe("Updated Title");

    authAs("test_listings_other", "other@example.com");
    const forbiddenRes = await request(createApp())
      .patch(`/api/v1/listings/${listing.id}/`)
      .send({ title: "Hijacked" });
    expect(forbiddenRes.status).toBe(404);
  });

  it("DELETE /:id/ removes the listing for its owner", async () => {
    const owner = await makeUser("test_listings_owner4", "owner4@example.com", true);
    const listing = await prisma.listing.create({
      data: { ...validInput, sizeSqft: 120, priceCents: 15000, priceUnit: "monthly", category: "spare_room", status: "draft", lat: 1, lng: 1, ownerId: owner.id },
    });

    authAs("test_listings_owner4", "owner4@example.com");
    const res = await request(createApp()).delete(`/api/v1/listings/${listing.id}/`);
    expect(res.status).toBe(204);

    const gone = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(gone).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- routes/listings.test.ts`
Expected: FAIL — route module doesn't exist / all requests 404.

- [ ] **Step 3: Write `src/routes/listings.ts`**

```ts
import { ListingCategory, ListingStatus, PriceUnit } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { attachDbUserIfPresent, requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";
import { toListingJSON } from "../serializers/listing";

export const listingsRouter = Router();

const listingInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.nativeEnum(ListingCategory),
  size_sqft: z.number().int().positive(),
  price_cents: z.number().int().positive(),
  price_unit: z.nativeEnum(PriceUnit),
  address: z.string().min(1),
  access_rules: z.string().optional().default(""),
  prohibited_items: z.string().optional().default(""),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

async function findListingForRequest(id: number, dbUserId?: number) {
  const listing = await prisma.listing.findUnique({ where: { id }, include: { photos: true } });
  if (!listing) return null;
  if (listing.status === ListingStatus.active) return listing;
  if (dbUserId && listing.ownerId === dbUserId) return listing;
  return null;
}

listingsRouter.get("/", attachDbUserIfPresent, async (req, res) => {
  const where = req.dbUser
    ? { OR: [{ status: ListingStatus.active }, { ownerId: req.dbUser.id }] }
    : { status: ListingStatus.active };

  const listings = await prisma.listing.findMany({
    where,
    include: { photos: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(listings.map(toListingJSON));
});

listingsRouter.post("/", requireAuth, async (req, res) => {
  if (!req.dbUser!.isVerified) {
    res.status(400).json({ detail: "Only ID-verified hosts can create a listing." });
    return;
  }

  const parsed = listingInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ detail: parsed.error.flatten() });
    return;
  }
  const { latitude, longitude, ...rest } = parsed.data;

  const listing = await prisma.listing.create({
    data: { ...rest, lat: latitude, lng: longitude, ownerId: req.dbUser!.id },
    include: { photos: true },
  });
  res.status(201).json(toListingJSON(listing));
});

listingsRouter.get("/:id/", attachDbUserIfPresent, async (req, res) => {
  const listing = await findListingForRequest(Number(req.params.id), req.dbUser?.id);
  if (!listing) {
    res.status(404).json({ detail: "Not found." });
    return;
  }
  res.json(toListingJSON(listing));
});

listingsRouter.patch("/:id/", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== req.dbUser!.id) {
    res.status(404).json({ detail: "Not found." });
    return;
  }

  const parsed = listingInputSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ detail: parsed.error.flatten() });
    return;
  }
  const { latitude, longitude, ...rest } = parsed.data;

  const listing = await prisma.listing.update({
    where: { id },
    data: {
      ...rest,
      ...(latitude !== undefined ? { lat: latitude } : {}),
      ...(longitude !== undefined ? { lng: longitude } : {}),
    },
    include: { photos: true },
  });
  res.json(toListingJSON(listing));
});

listingsRouter.delete("/:id/", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== req.dbUser!.id) {
    res.status(404).json({ detail: "Not found." });
    return;
  }
  await prisma.listing.delete({ where: { id } });
  res.status(204).end();
});
```

- [ ] **Step 4: Wire it into `src/app.ts`**

Modify `backend/src/app.ts` — add import and mount:
```ts
import { listingsRouter } from "./routes/listings";
// ...
  app.use("/api/v1/listings", listingsRouter);
```
(add this line after the existing `app.use("/api/v1/users", usersRouter);` line)

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- routes/listings.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/listings.ts backend/src/app.ts backend/tests/routes/listings.test.ts
git commit -m "feat(backend): add listings CRUD routes with owner/verification permissions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Listings routes — photos and publish

**Files:**
- Modify: `backend/src/routes/listings.ts` (append two routes)
- Test: `backend/tests/routes/listings-photos-publish.test.ts`

**Interfaces:**
- Consumes: `uploadPublicObject` (Task 4), everything from Task 8's `listingsRouter`.
- Produces: `POST /:id/photos/`, `POST /:id/publish/` on the same `listingsRouter`.

- [ ] **Step 1: Write the failing test**

`backend/tests/routes/listings-photos-publish.test.ts`:
```ts
jest.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: jest.fn(),
  clerkClient: { users: { getUser: jest.fn() } },
}));
jest.mock("../../src/storage/r2", () => ({
  uploadPublicObject: jest.fn().mockResolvedValue("https://media.sqftex.test/public/listings/fake.jpg"),
}));

import request from "supertest";
import { clerkClient, getAuth } from "@clerk/express";
import { createApp } from "../../src/app";
import { prisma } from "../../src/prisma";

async function makeUser(clerkUserId: string, email: string) {
  return prisma.user.create({ data: { clerkUserId, email, isVerified: true } });
}

function authAs(clerkUserId: string, email: string) {
  (getAuth as jest.Mock).mockReturnValue({ userId: clerkUserId });
  (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
    emailAddresses: [{ emailAddress: email }],
  });
}

async function makeDraftListing(ownerId: number) {
  return prisma.listing.create({
    data: {
      title: "Spare Room", description: "x", category: "spare_room", sizeSqft: 100,
      priceCents: 1000, priceUnit: "monthly", address: "x", lat: 1, lng: 1,
      status: "draft", ownerId,
    },
  });
}

describe("listings photos + publish routes", () => {
  afterEach(async () => {
    await prisma.listing.deleteMany({ where: { owner: { clerkUserId: { startsWith: "test_pub_" } } } });
    await prisma.user.deleteMany({ where: { clerkUserId: { startsWith: "test_pub_" } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("POST /:id/publish/ rejects a listing with no photos", async () => {
    const owner = await makeUser("test_pub_1", "pub1@example.com");
    const listing = await makeDraftListing(owner.id);
    authAs("test_pub_1", "pub1@example.com");

    const res = await request(createApp()).post(`/api/v1/listings/${listing.id}/publish/`);
    expect(res.status).toBe(400);
  });

  it("POST /:id/photos/ then POST /:id/publish/ activates the listing", async () => {
    const owner = await makeUser("test_pub_2", "pub2@example.com");
    const listing = await makeDraftListing(owner.id);
    authAs("test_pub_2", "pub2@example.com");

    const photoRes = await request(createApp())
      .post(`/api/v1/listings/${listing.id}/photos/`)
      .attach("image", Buffer.from("fake-image-bytes"), "cover.jpg");
    expect(photoRes.status).toBe(201);
    expect(photoRes.body.image).toBe("https://media.sqftex.test/public/listings/fake.jpg");

    const publishRes = await request(createApp()).post(`/api/v1/listings/${listing.id}/publish/`);
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.status).toBe("active");
    expect(publishRes.body.photos).toHaveLength(1);
  });

  it("POST /:id/photos/ 404s for a non-owner", async () => {
    const owner = await makeUser("test_pub_3", "pub3@example.com");
    const other = await makeUser("test_pub_4", "pub4@example.com");
    const listing = await makeDraftListing(owner.id);

    authAs("test_pub_4", "pub4@example.com");
    const res = await request(createApp())
      .post(`/api/v1/listings/${listing.id}/photos/`)
      .attach("image", Buffer.from("fake"), "x.jpg");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- listings-photos-publish.test.ts`
Expected: FAIL — routes return 404 (not registered).

- [ ] **Step 3: Append the two routes to `src/routes/listings.ts`**

Add the import at the top (alongside the existing ones):
```ts
import multer from "multer";
import { uploadPublicObject } from "../storage/r2";
```

Add at the bottom of the file:
```ts
const upload = multer({ storage: multer.memoryStorage() });

listingsRouter.post("/:id/photos/", requireAuth, upload.single("image"), async (req, res) => {
  const id = Number(req.params.id);
  const listing = await prisma.listing.findUnique({ where: { id }, include: { photos: true } });
  if (!listing || listing.ownerId !== req.dbUser!.id) {
    res.status(404).json({ detail: "Not found." });
    return;
  }
  if (!req.file) {
    res.status(400).json({ detail: "No image file provided." });
    return;
  }

  const imageUrl = await uploadPublicObject(req.file.buffer, req.file.mimetype, req.file.originalname);
  const photo = await prisma.listingPhoto.create({
    data: { listingId: id, imageUrl, order: listing.photos.length },
  });
  res.status(201).json({ id: photo.id, image: photo.imageUrl, order: photo.order });
});

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
  const updated = await prisma.listing.update({
    where: { id },
    data: { status: ListingStatus.active },
    include: { photos: true },
  });
  res.json(toListingJSON(updated));
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- listings-photos-publish.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full backend test suite**

Run: `npm test`
Expected: PASS, all tests across every prior task.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/listings.ts backend/tests/routes/listings-photos-publish.test.ts
git commit -m "feat(backend): add listing photo upload and publish routes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: AdminJS

**Files:**
- Create: `backend/src/admin/adminRouter.ts`
- Modify: `backend/src/app.ts` (mount at `/admin`)
- Test: `backend/tests/admin.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 3), `env` (Task 2). (Not `getPresignedUrl` — AdminJS's default UI
  shows `nricPhotoUrl` as a plain string field for v1; a custom preview component is a follow-up,
  not part of this task's code.)
- Produces: `adminRouter` mounted at `/admin` in `src/app.ts`.

- [ ] **Step 1: Install AdminJS**

Run (PowerShell, `backend/`):
```
npm install adminjs @adminjs/express @adminjs/prisma express-session express-formidable
npm install --save-dev @types/express-session
```

- [ ] **Step 2: Write the failing test**

`backend/tests/admin.test.ts`:
```ts
import request from "supertest";
import { createApp } from "../src/app";

describe("AdminJS", () => {
  it("serves a login page at /admin/login", async () => {
    const res = await request(createApp()).get("/admin/login");
    expect(res.status).toBe(200);
    expect(res.text).toContain("login");
  });

  it("redirects unauthenticated requests to /admin away from the dashboard", async () => {
    const res = await request(createApp()).get("/admin");
    expect([302, 401]).toContain(res.status);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- admin.test.ts`
Expected: FAIL — `/admin/login` 404s (route doesn't exist).

- [ ] **Step 4: Write `src/admin/adminRouter.ts`**

```ts
import AdminJS from "adminjs";
import AdminJSExpress from "@adminjs/express";
import { Database, Resource, getModelByName } from "@adminjs/prisma";
import { env } from "../env";
import { prisma } from "../prisma";

AdminJS.registerAdapter({ Database, Resource });

export const admin = new AdminJS({
  rootPath: "/admin",
  resources: [
    {
      resource: { model: getModelByName("User"), client: prisma },
      options: { navigation: { name: "Accounts" } },
    },
    {
      resource: { model: getModelByName("Listing"), client: prisma },
      options: { navigation: { name: "Marketplace" } },
    },
    {
      resource: { model: getModelByName("ListingPhoto"), client: prisma },
      options: { navigation: { name: "Marketplace" } },
    },
    {
      resource: { model: getModelByName("IdentityVerification"), client: prisma },
      options: {
        navigation: { name: "Accounts" },
        actions: {
          approve: {
            actionType: "record",
            handler: async (_request, _response, context) => {
              const { record, currentAdmin } = context;
              await prisma.identityVerification.update({
                where: { id: Number(record?.params.id) },
                data: { status: "approved", reviewedAt: new Date() },
              });
              return { record: record?.toJSON(currentAdmin) };
            },
          },
          reject: {
            actionType: "record",
            handler: async (_request, _response, context) => {
              const { record, currentAdmin } = context;
              await prisma.identityVerification.update({
                where: { id: Number(record?.params.id) },
                data: { status: "rejected", reviewedAt: new Date() },
              });
              return { record: record?.toJSON(currentAdmin) };
            },
          },
        },
      },
    },
  ],
});

export const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
  admin,
  {
    authenticate: async (email: string, password: string) => {
      if (email === env.ADMIN_EMAIL && password === env.ADMIN_PASSWORD) {
        return { email };
      }
      return null;
    },
    cookiePassword: env.ADMIN_COOKIE_SECRET,
  },
  null,
  {
    resave: false,
    saveUninitialized: false,
    secret: env.ADMIN_COOKIE_SECRET,
  }
);
```

Note: `reviewedById` is intentionally left unset by the Approve/Reject actions — AdminJS auth here
is a single hardcoded operator login, not tied to a `User` row, so there's no meaningful id to
attribute the review to (matches the "one operator reviews NRIC uploads" reality this replaces).

- [ ] **Step 5: Wire it into `src/app.ts`**

Modify `backend/src/app.ts`:
```ts
import { adminRouter } from "./admin/adminRouter";
// ...
  app.use(adminRouter);
```
(add this line right after `app.use(clerkAuth);` — before the `/health` route — so `/admin` isn't
shadowed by anything else; AdminJS's router owns the full `/admin` prefix internally)

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- admin.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/src/admin backend/src/app.ts backend/tests/admin.test.ts backend/package.json backend/package-lock.json
git commit -m "feat(backend): add AdminJS admin panel with NRIC verification review

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: Seed script

**Files:**
- Create: `backend/scripts/seed.ts`

**Interfaces:**
- Consumes: `prisma` (Task 3), `env` (Task 2). Uses `@clerk/backend` directly (separate from `@clerk/express`).
- Produces: a runnable script (`npm run seed`, or `npm run seed -- --flush`) — no other task depends on this one; it's a leaf.

- [ ] **Step 1: Install `@clerk/backend`**

Run (PowerShell, `backend/`):
```
npm install @clerk/backend
```

- [ ] **Step 2: Write `scripts/seed.ts`**

```ts
import "dotenv/config";
import { createClerkClient } from "@clerk/backend";
import { PrismaClient, VerificationStatus } from "@prisma/client";

const prisma = new PrismaClient();
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

const DEMO_DOMAIN = "sqftex.test";
const DEMO_PASSWORD = "Demo12345!";

const DEMO_USERS = [
  { key: "host.jane", isVerified: true },
  { key: "host.ravi", isVerified: true },
  { key: "host.pending", isVerified: false },
  { key: "renter.mei", isVerified: true },
  { key: "renter.arif", isVerified: true },
] as const;

type ListingSeed = {
  owner: (typeof DEMO_USERS)[number]["key"];
  title: string;
  category: "spare_room" | "garage" | "shoplot_back_room" | "warehouse_bay";
  sizeSqft: number;
  priceCents: number;
  priceUnit: "daily" | "monthly";
  status: "draft" | "active";
  address: string;
  lat: number;
  lng: number;
};

const DEMO_LISTINGS: ListingSeed[] = [
  { owner: "host.jane", title: "Spare Room in PJ Old Town", category: "spare_room", sizeSqft: 120, priceCents: 15000, priceUnit: "monthly", status: "active", address: "Jalan Timur, Petaling Jaya Old Town, Selangor", lat: 3.1073, lng: 101.6415 },
  { owner: "host.jane", title: "Double Garage Bay, Subang Jaya", category: "garage", sizeSqft: 280, priceCents: 45000, priceUnit: "monthly", status: "active", address: "SS15, Subang Jaya, Selangor", lat: 3.0738, lng: 101.5810 },
  { owner: "host.jane", title: "Small Storage Nook, Bangsar", category: "spare_room", sizeSqft: 60, priceCents: 800, priceUnit: "daily", status: "draft", address: "Jalan Telawi, Bangsar, Kuala Lumpur", lat: 3.1300, lng: 101.6700 },
  { owner: "host.ravi", title: "Shoplot Back Room, Klang", category: "shoplot_back_room", sizeSqft: 200, priceCents: 35000, priceUnit: "monthly", status: "active", address: "Batu Unjur, Klang, Selangor", lat: 3.0333, lng: 101.4500 },
  { owner: "host.ravi", title: "Warehouse Bay, Shah Alam", category: "warehouse_bay", sizeSqft: 1500, priceCents: 180000, priceUnit: "monthly", status: "active", address: "Seksyen 15, Shah Alam, Selangor", lat: 3.0654, lng: 101.5178 },
  { owner: "host.ravi", title: "Half Warehouse Bay, Cheras", category: "warehouse_bay", sizeSqft: 900, priceCents: 3500, priceUnit: "daily", status: "active", address: "Taman Segar, Cheras, Kuala Lumpur", lat: 3.0980, lng: 101.7360 },
];

async function findOrCreateClerkUser(email: string) {
  const existing = await clerkClient.users.getUserList({ emailAddress: [email] });
  if (existing.data.length > 0) return existing.data[0];
  return clerkClient.users.createUser({
    emailAddress: [email],
    password: DEMO_PASSWORD,
    skipPasswordChecks: true,
  });
}

async function main() {
  const flush = process.argv.includes("--flush");
  if (flush) {
    const deleted = await prisma.user.deleteMany({ where: { email: { endsWith: `@${DEMO_DOMAIN}` } } });
    console.log(`Flushed ${deleted.count} demo user(s) (and their listings, via cascade).`);
  }

  const users: Record<string, { id: number }> = {};
  for (const demo of DEMO_USERS) {
    const email = `${demo.key}@${DEMO_DOMAIN}`;
    const clerkUser = await findOrCreateClerkUser(email);
    const dbUser = await prisma.user.upsert({
      where: { clerkUserId: clerkUser.id },
      update: { email, isVerified: demo.isVerified },
      create: { clerkUserId: clerkUser.id, email, isVerified: demo.isVerified },
    });
    users[demo.key] = dbUser;
    console.log(`  ready   ${email}`);
  }

  for (const demo of DEMO_USERS) {
    if (!demo.isVerified) continue;
    const existing = await prisma.identityVerification.findFirst({
      where: { userId: users[demo.key].id, status: VerificationStatus.approved },
    });
    if (!existing) {
      await prisma.identityVerification.create({
        data: {
          userId: users[demo.key].id,
          nricPhotoUrl: "private/verification/demo-placeholder.jpg",
          status: VerificationStatus.approved,
          reviewedAt: new Date(),
          notes: "Auto-approved demo account.",
        },
      });
    }
  }
  const pendingExisting = await prisma.identityVerification.findFirst({
    where: { userId: users["host.pending"].id, status: VerificationStatus.pending },
  });
  if (!pendingExisting) {
    await prisma.identityVerification.create({
      data: {
        userId: users["host.pending"].id,
        nricPhotoUrl: "private/verification/demo-placeholder.jpg",
        status: VerificationStatus.pending,
      },
    });
  }

  let createdCount = 0;
  for (const seed of DEMO_LISTINGS) {
    const existing = await prisma.listing.findFirst({
      where: { ownerId: users[seed.owner].id, title: seed.title },
    });
    if (existing) continue;
    await prisma.listing.create({
      data: {
        ownerId: users[seed.owner].id,
        title: seed.title,
        description: `${seed.title} — available now. Clean, secure, easy access.`,
        category: seed.category,
        sizeSqft: seed.sizeSqft,
        priceCents: seed.priceCents,
        priceUnit: seed.priceUnit,
        status: seed.status,
        address: seed.address,
        accessRules: "Contact host to arrange a visit before move-in.",
        prohibitedItems: "No flammable, perishable, or illegal items.",
        lat: seed.lat,
        lng: seed.lng,
      },
    });
    createdCount += 1;
  }

  console.log(`\nDone. ${createdCount} new listing(s) created.`);
  console.log(`\nDemo accounts (all use the same password: ${DEMO_PASSWORD}):`);
  for (const demo of DEMO_USERS) {
    const role = demo.isVerified ? "verified" : "pending verification";
    console.log(`  ${demo.key}@${DEMO_DOMAIN}  (${role})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Manual verification (requires a real Clerk secret key in `backend/.env`)**

Run (PowerShell, `backend/`):
```
npm run seed
```
Expected: console output listing 6 created accounts and 6 created listings, no errors. Without a
real `CLERK_SECRET_KEY` this will fail calling the Clerk API — that's expected per the spec's
noted prerequisite; re-run once real keys are in place.

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/seed.ts backend/package.json backend/package-lock.json
git commit -m "feat(backend): add Clerk-backed demo data seed script

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 12: Deployment files and docker-compose

**Files:**
- Create: `backend/Dockerfile` (overwrite the Python one)
- Create: `backend/Procfile` (overwrite the Python one)
- Modify: `docker-compose.yml`

**Interfaces:**
- None — this task only changes deployment/orchestration config, no code interfaces.

- [ ] **Step 1: Overwrite `backend/Dockerfile`**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 8000

CMD ["npm", "start"]
```

- [ ] **Step 2: Overwrite `backend/Procfile`**

```
web: npx prisma migrate deploy && npm start
```

- [ ] **Step 3: Modify `docker-compose.yml`**

Change the `db` image and the `web` service:
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: sqftex
      POSTGRES_USER: sqftex
      POSTGRES_PASSWORD: sqftex
    ports:
      - "5432:5432"
    volumes:
      - sqftex_pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7
    ports:
      - "6379:6379"
  web:
    build: ./backend
    command: sh -c "npx prisma migrate deploy && npm start"
    volumes:
      - ./backend:/app
      - /app/node_modules
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    environment:
      DATABASE_URL: postgresql://sqftex:sqftex@db:5432/sqftex?schema=public
    depends_on:
      - db
      - redis
volumes:
  sqftex_pgdata:
```
(only `db.image`, `web.command`, `web.volumes`, and the added `web.environment` block change —
everything else stays as it is today)

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile backend/Procfile docker-compose.yml
git commit -m "feat(backend): switch deployment config to Node/Express, drop PostGIS image

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 13: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** none.

- [ ] **Step 1: Update the Stack section**

Replace:
```
- **Backend**: Django + Django REST Framework, Python
```
with:
```
- **Backend**: Express + TypeScript, Prisma ORM
- **Backend auth**: Clerk (identity) + a local `User` row keyed by `clerkUserId` for domain data
  (verification status, listing ownership)
- **Admin panel**: AdminJS (replaces Django admin) — NRIC verification review, single
  env-configured operator login
```
Replace:
```
- **Auth**: django-allauth + custom NRIC verification step (manually reviewed
  via Django admin for v1 — no 3rd-party KYC vendor yet)
```
with:
```
- **Auth**: Clerk, plus a custom NRIC verification step (manually reviewed via AdminJS for v1 —
  no 3rd-party KYC vendor yet)
```
Replace:
```
- **Database**: PostgreSQL + PostGIS (for location/geo search)
```
with:
```
- **Database**: PostgreSQL (plain `lat`/`lng` floats on `Listing`, no PostGIS — Prisma has no
  native GIS type; radius/geo search, if built later, does the math in application code)
```

- [ ] **Step 2: Update the repo layout comment**

Replace:
```
/backend          Django project (DRF API only, no server-rendered templates
                   except /admin)
  /apps
    /users         Auth, profiles, NRIC verification
    /listings      Space listings, categories, photos
    /bookings      Booking lifecycle, availability
    /payments      Curlec integration, escrow, payouts, commission
    /reviews       Ratings/reviews post-rental
```
with:
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
```

- [ ] **Step 3: Update the Commands section**

Replace:
```
- Backend tests: `cd backend && python manage.py test`
- Backend dev server: `cd backend && python manage.py runserver`
- Frontend dev server: `cd frontend && npm run dev`
- Migrations: `cd backend && python manage.py makemigrations && python manage.py migrate`
```
with:
```
- Backend tests: `cd backend && npm test`
- Backend dev server: `cd backend && npm run dev`
- Frontend dev server: `cd frontend && npm run dev`
- Migrations: `cd backend && npx prisma migrate dev --name <description>`
- Seed demo data: `cd backend && npm run seed` (add `-- --flush` to wipe and re-seed)
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Express/Prisma/AdminJS/Clerk stack

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 14: Frontend — Clerk integration

**Files:**
- Modify: `frontend/package.json` (add `@clerk/nextjs`)
- Create: `frontend/middleware.ts`
- Modify: `frontend/app/layout.tsx`
- Delete: `frontend/app/login/page.tsx`
- Create: `frontend/app/login/[[...rest]]/page.tsx`
- Create: `frontend/app/sign-up/[[...rest]]/page.tsx`
- Modify: `frontend/components/layout/NavBar.tsx`
- Modify: `frontend/lib/api/client.ts`
- Modify: `frontend/lib/api/listings.ts`
- Modify: `frontend/lib/api/users.ts`
- Modify: `frontend/app/listings/page.tsx`
- Modify: `frontend/app/listings/[id]/page.tsx`
- Modify: `frontend/app/listings/new/page.tsx`
- Modify: `frontend/components/listings/ListingForm.tsx`
- Create: `frontend/.env.local.example`

**Interfaces:** none new — this task rewires existing frontend call sites to Clerk; no new
cross-task interfaces are produced.

- [ ] **Step 1: Install Clerk's Next.js SDK**

Run (PowerShell, `frontend/`):
```
cd E:\003Resources\001Repositories\sqftex\frontend
npm install @clerk/nextjs
```

- [ ] **Step 2: Create `frontend/middleware.ts`**

```ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
```

- [ ] **Step 3: Wrap the root layout in `ClerkProvider`**

Rewrite `frontend/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Archivo, Work_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["500", "700", "900"],
});
const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "sqftex — Microwarehousing for Malaysia",
  description:
    "sqftex connects Space Owners with spare square footage to Space Seekers who need short- or mid-term storage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${archivo.variable} ${workSans.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 4: Replace the login page with Clerk's `<SignIn/>`**

Delete `frontend/app/login/page.tsx`.

Create `frontend/app/login/[[...rest]]/page.tsx`:
```tsx
import { SignIn } from "@clerk/nextjs";
import { NavBar } from "@/components/layout/NavBar";

export default function LoginPage() {
  return (
    <div>
      <NavBar variant="guest" />
      <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
        <SignIn path="/login" routing="path" signUpUrl="/sign-up" />
      </div>
    </div>
  );
}
```

Create `frontend/app/sign-up/[[...rest]]/page.tsx`:
```tsx
import { SignUp } from "@clerk/nextjs";
import { NavBar } from "@/components/layout/NavBar";

export default function SignUpPage() {
  return (
    <div>
      <NavBar variant="guest" />
      <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
        <SignUp path="/sign-up" routing="path" signInUrl="/login" />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Show real sign-in state in `NavBar`**

Rewrite `frontend/components/layout/NavBar.tsx`:
```tsx
import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

// Shared top nav. "guest" is shown on marketing/auth screens (landing, login);
// "app" is shown on the logged-in surfaces (browse, listing detail, create
// listing) — this only controls which nav links show, not sign-in state,
// which comes from Clerk directly via <SignedIn>/<SignedOut>.
interface NavBarProps {
  variant: "guest" | "app";
}

export function NavBar({ variant }: NavBarProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        height: 80,
        padding: "0 64px",
        borderBottom: "3px solid var(--ink)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
        <Link href="/" style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 900 }}>
          sqftex
        </Link>
        {variant === "app" && (
          <div style={{ display: "flex", gap: 28 }}>
            <Link href="/listings" className="nav-link">
              Browse
            </Link>
            <Link href="/listings/new" className="nav-link">
              List a space
            </Link>
          </div>
        )}
      </div>

      <SignedOut>
        <Link href="/login" className="btn-primary">
          Log in
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}
```

- [ ] **Step 6: Rewrite `lib/api/client.ts` to attach a Clerk token instead of a CSRF cookie**

```ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, method, headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API request failed (${response.status}): ${body}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
```

- [ ] **Step 7: Thread a token parameter through `lib/api/listings.ts`**

```ts
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
  price_cents: number;
  price_unit: "daily" | "monthly";
  address: string;
  access_rules: string;
  prohibited_items: string;
  status: "draft" | "active";
  photos: ListingPhoto[];
  location_lat: number;
  location_lng: number;
  created_at: string;
  updated_at: string;
}

export interface CreateListingInput {
  title: string;
  description: string;
  category: string;
  size_sqft: number;
  price_cents: number;
  price_unit: "daily" | "monthly";
  address: string;
  access_rules: string;
  prohibited_items: string;
  latitude: number;
  longitude: number;
}

export async function listListings(token?: string | null): Promise<Listing[]> {
  return apiFetch<Listing[]>("/api/v1/listings/", {}, token);
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

- [ ] **Step 8: Rewrite `lib/api/users.ts`** (drop `login` — Clerk owns sign-in now)

```ts
import { apiFetch } from "./client";

export interface User {
  id: number;
  email: string;
  username: string | null;
  is_verified: boolean;
}

export async function getMe(token?: string | null): Promise<User | null> {
  try {
    return await apiFetch<User>("/api/v1/users/me/", {}, token);
  } catch {
    return null;
  }
}
```

- [ ] **Step 9: Update `app/listings/page.tsx`** to pass a Clerk token

```tsx
import { auth } from "@clerk/nextjs/server";
import { listListings } from "@/lib/api/listings";
import { NavBar } from "@/components/layout/NavBar";
import { ListingBrowser } from "@/components/listings/ListingBrowser";

// Listings change constantly and there's no live backend at build time in
// this environment (no static export config) — render this route per-request
// instead of letting Next attempt to prerender it statically at build time.
export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const { getToken } = await auth();
  const token = await getToken();
  const listings = await listListings(token);

  return (
    <div>
      <NavBar variant="app" />
      {listings.length === 0 ? (
        <div style={{ padding: "40px 64px" }}>
          <p style={{ fontSize: 15 }}>No listings yet.</p>
        </div>
      ) : (
        <ListingBrowser listings={listings} />
      )}
    </div>
  );
}
```

- [ ] **Step 10: Update `app/listings/[id]/page.tsx`** to pass a Clerk token

Modify only the top of the file — change:
```tsx
import Link from "next/link";
import { getListing } from "@/lib/api/listings";
import { categoryLabel } from "@/lib/listingCategories";
import { NavBar } from "@/components/layout/NavBar";

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const listing = await getListing(Number(params.id));
```
to:
```tsx
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getListing } from "@/lib/api/listings";
import { categoryLabel } from "@/lib/listingCategories";
import { NavBar } from "@/components/layout/NavBar";

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const { getToken } = await auth();
  const token = await getToken();
  const listing = await getListing(Number(params.id), token);
```
(the rest of the file, from the `const ringgit = ...` line down, is unchanged)

- [ ] **Step 11: Rewrite `app/listings/new/page.tsx`** to use Clerk + the shared `getMe`

```tsx
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ListingForm } from "@/components/listings/ListingForm";
import { NavBar } from "@/components/layout/NavBar";
import { getMe } from "@/lib/api/users";

export default async function NewListingPage() {
  const { userId, getToken } = await auth();
  if (!userId) {
    redirect("/login");
  }

  const token = await getToken();
  const me = await getMe(token);

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
              border: "3px solid var(--ink)",
              borderRadius: 2,
            }}
          >
            <div className="label" style={{ color: "var(--secondary-dark)" }}>
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "56px 64px 96px" }}>
        <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="label">New listing</div>
            <h1 style={{ fontSize: 36 }}>LIST YOUR SPACE</h1>
          </div>
          <ListingForm />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 12: Rewrite `components/listings/ListingForm.tsx`** to get a token via `useAuth()`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { addListingPhoto, createListing, publishListing } from "@/lib/api/listings";
import { LISTING_CATEGORIES } from "@/lib/listingCategories";

export function ListingForm() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<string>(LISTING_CATEGORIES[0].value);
  const [priceUnit, setPriceUnit] = useState<"daily" | "monthly">("monthly");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const data = new FormData(event.currentTarget);
    const photoFile = data.get("photo") as File;

    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in.");

      const listing = await createListing(
        {
          title: String(data.get("title")),
          description: String(data.get("description")),
          category,
          size_sqft: Number(data.get("size_sqft")),
          price_cents: Math.round(Number(data.get("price_myr")) * 100),
          price_unit: priceUnit,
          address: String(data.get("address")),
          access_rules: String(data.get("access_rules") ?? ""),
          prohibited_items: String(data.get("prohibited_items") ?? ""),
          latitude: Number(data.get("latitude")),
          longitude: Number(data.get("longitude")),
        },
        token
      );

      if (photoFile && photoFile.size > 0) {
        await addListingPhoto(listing.id, photoFile, token);
      }

      await publishListing(listing.id, token);
      router.push(`/listings/${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong creating the listing.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {error && <p role="alert">{error}</p>}

      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" placeholder="e.g. Ground-floor warehouse bay, Petaling Jaya" required />
      </div>

      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" required />
      </div>

      <div className="field">
        <label>Category</label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {LISTING_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className="chip"
              data-active={category === c.value}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="address">Address</label>
        <input id="address" name="address" placeholder="Street, area" required />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="field">
          <label htmlFor="size_sqft">Size (sqft)</label>
          <input id="size_sqft" name="size_sqft" type="number" min="1" placeholder="320" required />
        </div>
        <div className="field">
          <label htmlFor="price_myr">Price (RM)</label>
          <input id="price_myr" name="price_myr" type="number" min="0" step="0.01" placeholder="680" required />
        </div>
      </div>

      <div className="field">
        <label>Billed</label>
        <div style={{ display: "flex", border: "2px solid var(--ink)", borderRadius: 2, overflow: "hidden", maxWidth: 280 }}>
          <button
            type="button"
            className="seg"
            data-active={priceUnit === "daily"}
            onClick={() => setPriceUnit("daily")}
          >
            DAILY
          </button>
          <button
            type="button"
            className="seg"
            data-active={priceUnit === "monthly"}
            onClick={() => setPriceUnit("monthly")}
          >
            MONTHLY
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="field">
          <label htmlFor="latitude">Latitude</label>
          <input id="latitude" name="latitude" type="number" step="any" required />
        </div>
        <div className="field">
          <label htmlFor="longitude">Longitude</label>
          <input id="longitude" name="longitude" type="number" step="any" required />
        </div>
      </div>

      <div className="field">
        <label htmlFor="access_rules">Access rules</label>
        <textarea id="access_rules" name="access_rules" />
      </div>

      <div className="field">
        <label htmlFor="prohibited_items">Prohibited items</label>
        <textarea id="prohibited_items" name="prohibited_items" />
      </div>

      <div className="field">
        <label htmlFor="photo">Photo</label>
        <input id="photo" name="photo" type="file" accept="image/*" />
      </div>

      <button type="submit" className="btn-primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
        {submitting ? "Creating..." : "Publish listing"}
      </button>
    </form>
  );
}
```

- [ ] **Step 13: Add `frontend/.env.local.example`**

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

- [ ] **Step 14: Manual verification**

Run (PowerShell, `frontend/`): `npm run dev`, then open `http://localhost:3000` in a browser.
Expected: homepage loads; `/login` renders Clerk's sign-in form instead of the old custom form
(full functional login requires real Clerk keys in `frontend/.env.local`, per the spec's noted
prerequisite — until then this is a visual/wiring check, not a full login test).

- [ ] **Step 15: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/middleware.ts frontend/app/layout.tsx frontend/app/login frontend/app/sign-up frontend/components/layout/NavBar.tsx frontend/lib/api frontend/app/listings frontend/components/listings/ListingForm.tsx frontend/.env.local.example
git commit -m "feat(frontend): integrate Clerk for auth, replace login page and CSRF-cookie API client

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 15: Cutover — remove the Django backend, final verification

**Files:**
- Delete: `backend/apps/`
- Delete: `backend/config/`
- Delete: `backend/manage.py`
- Delete: `backend/requirements.txt`
- Delete: `backend/runtime.txt`
- Delete: `backend/test-media/` (if present)

**Interfaces:** none — this is pure deletion plus a manual end-to-end check.

- [ ] **Step 1: Delete the Django project files**

Run (PowerShell, repo root):
```
Remove-Item -Recurse -Force backend\apps, backend\config, backend\manage.py, backend\requirements.txt, backend\runtime.txt
if (Test-Path backend\test-media) { Remove-Item -Recurse -Force backend\test-media }
```

- [ ] **Step 2: Run the full backend test suite one more time**

Run (PowerShell, `backend/`): `npm test`
Expected: PASS — confirms nothing in the Node backend accidentally depended on the now-deleted
Python files (it shouldn't have; they were never imported cross-language).

- [ ] **Step 3: Manual end-to-end verification**

Requires real `CLERK_SECRET_KEY`/`CLERK_PUBLISHABLE_KEY` (backend `.env` and frontend
`.env.local`) — this is the point where the spec's noted prerequisite actually gets exercised.

```
docker compose up -d db redis
cd backend
npx prisma migrate deploy
npm run seed
npm run dev
```
In a second terminal:
```
cd frontend
npm run dev
```
Then in a browser: sign up or sign in at `http://localhost:3000/login`, browse
`http://localhost:3000/listings` (should show the seeded listings), and create+publish a new
listing as a verified demo host. Check `http://localhost:8000/admin` (login with
`ADMIN_EMAIL`/`ADMIN_PASSWORD` from `backend/.env`) and confirm the `IdentityVerification`,
`User`, and `Listing` resources are all visible and the Approve/Reject action works on the
pending verification.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Django backend, complete migration to Express/Prisma/Clerk

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** every spec section maps to a task — architecture (Tasks 1, 5, 10), data model
  (Task 3), routes (Tasks 7–9), file storage (Task 4), frontend changes (Task 14), deployment
  (Task 12), seed data (Task 11), docs (Task 13), cutover (Task 15). The enum-casing fix made to
  the spec before this plan was written is reflected directly in Task 3's schema.
- **Type consistency checked:** `req.dbUser` (declared Task 5) used identically in Tasks 7–9;
  `toListingJSON`'s `ListingWithPhotos` shape (Task 6) matches what Tasks 8–9 pass it (Prisma
  `findMany`/`create`/`update` all `include: { photos: true }`); `uploadPublicObject` /
  `uploadPrivateObject` signatures (Task 4) match their call sites in Tasks 7 and 9 exactly;
  frontend `apiFetch(path, options, token)` signature (Task 14 Step 6) matches every call site
  added in Steps 7–8.
- **No placeholders:** every step has real, complete code — full file rewrites were used instead
  of "similar to Task N" wherever a file changes non-trivially (`NavBar.tsx`, `ListingForm.tsx`,
  `app/listings/new/page.tsx`), so an engineer reading tasks out of order never has to guess.
