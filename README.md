# EEG Practice Center

An EEG study app for neurology trainees — a question bank with multi-image questions, an EEG atlas, admin-authored literature, per-user and admin analytics, account management, and admin user management. Students register, answer questions (with retries), browse reference patterns, and track their accuracy; admins author all content and manage users.

- **Live:** https://learn-eeg.vercel.app
- **Repo:** https://github.com/zayeemZaki/learn-eeg

---

## Table of contents

1. [Overview](#1-overview)
2. [Tech stack](#2-tech-stack)
3. [Local setup](#3-local-setup)
4. [Creating an admin](#4-creating-an-admin)
5. [Deployment (Vercel)](#5-deployment-vercel)
6. [Architecture](#6-architecture)
7. [Scripts & commands](#7-scripts--commands)
8. [Known limitations & future hardening](#8-known-limitations--future-hardening)
9. [License & attribution](#9-license--attribution)

---

## 1. Overview

EEG Practice Center is a single Next.js (App Router) application backed by Postgres. It serves two audiences from one codebase:

- **Students** register, work through the **question bank** (each question can carry multiple EEG images shown as a gallery + lightbox), browse the **EEG atlas** (normal vs. abnormal variants), read **literature** articles, and view a personal **dashboard** of their progress.
- **Admins** author every piece of content — questions, atlas entries, and literature articles — and manage users, all under an admin-only area. There is no public sign-up for admin; the first admin is promoted manually (see [§4](#4-creating-an-admin)).

Correctness of an answer is **never** sent to the browser before the user answers — it is decided server-side. This is a load-bearing security invariant; see [the `isCorrect` boundary](#the-iscorrect-security-boundary).

---

## 2. Tech stack

Exact versions are from `package.json`.

| Area | Choice | Version |
| --- | --- | --- |
| Framework | [Next.js](https://nextjs.org) (App Router) | `^16.2.7` |
| UI runtime | React / React DOM | `^19.1.0` |
| Auth | [Auth.js / next-auth](https://authjs.dev) (Credentials + JWT) | `5.0.0-beta.31` (pinned beta) |
| Auth adapter | `@auth/prisma-adapter` | `^2.10.0` |
| ORM | [Prisma](https://www.prisma.io) (`prisma` + `@prisma/client`) | `^6.7.0` |
| Database | PostgreSQL (hosted on [Neon](https://neon.tech)) | — |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) (CSS-first `@theme`, **no** `tailwind.config`) | `^4.1.0` |
| Charts | [Recharts](https://recharts.org) | `^3.8.1` |
| Object storage | [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) (`@vercel/blob`) | `^2.4.0` |
| Email | [Resend](https://resend.com) | `^6.12.4` |
| Cache / rate-limit store | [ioredis](https://github.com/redis/ioredis) (Redis, **optional**) | `^5.6.0` |
| Password hashing | [bcryptjs](https://github.com/dcodeIO/bcrypt.js) (pure JS, no native build) | `^3.0.2` |
| Validation | [Zod](https://zod.dev) | `^3.25.0` |
| Scripts | [tsx](https://github.com/privatenumber/tsx) | `^4.19.0` |
| Language | TypeScript (strict) | `^5.8.0` |

### Notable architectural choices

- **Next 16, App Router.** Dynamic `params`/`searchParams` are **async** and must be `await`ed. The request gate lives in **`src/proxy.ts`** — Next 16 renamed the `middleware` convention to `proxy` and defaults it to the Node.js runtime (see [§5](#authedge-gotchas) for why this matters).
- **next-auth v5 (beta).** Credentials provider + JWT session strategy. Role is baked into the JWT — see [§4](#4-creating-an-admin).
- **Prisma 6 + Neon Postgres.** One datasource, `DATABASE_URL`.
- **Tailwind v4** is configured entirely in CSS (`src/app/globals.css` via `@import "tailwindcss"` + `@theme`). There is **no** `tailwind.config.{js,ts}`.
- **Vercel Blob** stores EEG images; uploads go **browser → Blob** directly via a short-lived admin-gated token (bypasses the serverless body-size limit).
- **Resend** sends password-reset email, defaulting to Resend's **sandbox sender** (delivers only to the account owner until a domain is verified).
- **Redis is optional and used only for login/register rate limiting.** With no `REDIS_URL`, the limiter fails open (no limiting) and the app runs normally.

---

## 3. Local setup

### Prerequisites

- **Node.js 20+** (the project targets the Next 16 / React 19 toolchain; there is no `.nvmrc` or `engines` field, so any active LTS ≥ 20 is fine).
- A PostgreSQL database. The project is built against **Neon**, but any Postgres works locally (local Docker, Supabase, etc.).
- _(Optional)_ a Redis instance, only if you want to exercise rate limiting locally.

### Steps

```bash
# 1. Clone
git clone https://github.com/zayeemZaki/learn-eeg.git
cd learn-eeg

# 2. Install dependencies
npm install

# 3. Create your env file (see the table below)
cp .env.example .env
#   …then fill in DATABASE_URL, and generate AUTH_SECRET:
npx auth secret            # writes AUTH_SECRET into .env

# 4. Apply the schema (also generates the typed Prisma client)
npm run db:migrate         # prisma migrate dev

# 5. (optional) Seed demo content — LOCAL DEV ONLY (see §7)
npm run db:seed
#   demo login → demo@eeg.test / password123

# 6. Run the dev server
npm run dev
#   → http://localhost:3000
```

> The repo ships **without** a generated Prisma client. `npm run db:migrate` (or `npx prisma generate`) creates it; until then your editor will flag missing `@prisma/client` exports. That is expected.

### Environment variables

Validated once at import time in `src/env.ts` (a misconfigured deploy fails fast and loud rather than deep inside a request). Always import `env` from there — never read `process.env` directly.

| Variable | Purpose | Required? | Example / where to get it |
| --- | --- | --- | --- |
| `DATABASE_URL` | Postgres connection string used by Prisma at runtime **and** for migrations. | **Required** | Neon → *Connect*. See the pooled-vs-direct note below. |
| `AUTH_SECRET` | Signs/encrypts the Auth.js JWT. | **Required** | `npx auth secret` (or `openssl rand -base64 33`) |
| `BLOB_READ_WRITE_TOKEN` | Enables admin EEG image uploads to Vercel Blob. Without it the app boots; uploads return a clear error. | Optional | Vercel → Storage → Blob → create store → copy token. Must encode a **public** store (see [§5](#vercel-blob-gotchas)). |
| `RESEND_API_KEY` | Sends password-reset email via Resend. Without it the app boots; requesting a reset throws a clear error. | Optional | Resend → API Keys |
| `EMAIL_FROM` | Sender for transactional mail. | Optional (defaults to the Resend sandbox sender) | Default: `EEG Quiz <onboarding@resend.dev>`. Change to `You <you@yourdomain.com>` after verifying a domain. |
| `APP_URL` | Absolute origin used to build reset-email links. | Optional (defaults to `http://localhost:3000`) | Set to the **deployed origin** in production, e.g. `https://learn-eeg.vercel.app`. |
| `REDIS_URL` | Backs **login/register rate limiting** (fixed-window, per-IP). If unset, the limiter **fails open** (no limiting) and the app still boots. *(Note: this used to cache a PubMed literature feed, which has been removed — Redis now serves rate limiting only.)* | Optional | `redis://localhost:6379` |
| `NODE_ENV` | Standard environment flag. | Optional (defaults to `development`) | `production` in prod |

> **Pooled vs. direct connection (Neon).** This project uses a **single** `DATABASE_URL` (there is **no** separate `DIRECT_URL`). Prisma **migrations** require a **direct (unpooled)** connection — the host **without** `-pooler`. `.env.example` therefore documents `DATABASE_URL` as the direct URL. If you point `DATABASE_URL` at a **pooled** endpoint (host containing `-pooler`), runtime queries work but `prisma migrate` can fail; a serverless runtime that needs pooling would typically split this into a pooled `DATABASE_URL` + a direct `directUrl` in `prisma/schema.prisma` — that split is **not** currently configured here. Today: use the **direct** URL so both runtime and migrations work.

---

## 4. Creating an admin

The app ships with **no admin** — every account is a `USER` until promoted. There is no in-app "grant admin" UI.

1. **Register on the site first.** You cannot promote a user that does not exist. Sign up at `/register` with the email you want to make admin.
2. **Promote that email.** Use either path:

   **Path A — the script (preferred):**
   ```bash
   npm run make-admin -- you@example.com
   ```
   The `--` passes the email through npm to `scripts/make-admin.ts`. The email is trimmed and lowercased to match how it's stored at registration. It exits non-zero with a clear message if the email is missing or no user matches, and is idempotent (says "already an ADMIN" if so).

   **Path B — SQL fallback (run against your database):**
   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE LOWER(email) = LOWER('you@example.com');
   ```

3. **⚠️ Log out and back in.** The role is **baked into the JWT at login**. A promotion does **not** affect an existing session — you must sign out and sign in again for the new `ADMIN` role to take effect (and to see the admin nav / reach `/admin`).

---

## 5. Deployment (Vercel)

The app deploys to Vercel as a standard Next.js project.

### Basics

- **Framework preset:** Next.js (auto-detected).
- **Set every env var** from [§3](#environment-variables) in Vercel for the **Production** environment (and Preview if you use it).
- **Env changes require a redeploy.** Vercel injects env vars at build/runtime; after changing one, **redeploy** so the change is picked up.
- **`APP_URL` differs per environment.** Locally it's `http://localhost:3000`; in production it must be the deployed origin (e.g. `https://learn-eeg.vercel.app`). A wrong `APP_URL` produces **broken password-reset links** (they'll point at the wrong host).

### Neon (database)

- `DATABASE_URL` must reach your Neon database. Because this project uses a single URL for both runtime and migrations, use the **direct (unpooled)** connection string so `prisma migrate` works (host **without** `-pooler`). See the [pooled-vs-direct note](#environment-variables).
- Apply migrations against the production DB with `npx prisma migrate deploy` (the non-interactive deploy command).

### Vercel Blob gotchas

These cost real debugging time — read before wiring up image uploads:

- **The Blob store must be created PUBLIC.** The client upload helper calls `upload(file.name, file, { access: "public", … })` (`src/lib/upload-eeg-image.ts`). A **private** store rejects the upload with a **400**. Blob's access mode is **permanent** — you cannot flip a private store to public; you must **recreate the store as public**.
- **`BLOB_READ_WRITE_TOKEN` must encode the CURRENT store.** Vercel Blob v2 derives the **target store from the token** itself. A stale token from a deleted or older store produces a **404** even though everything "looks" configured. If uploads 404, verify the token belongs to the live store (its store-id must match).

### Auth/edge gotchas

- **Next 16 uses `src/proxy.ts`, not `middleware.ts`.** The `middleware` convention defaulted to the Edge runtime, whose bundler rejected anything reachable from the entry that touched Node APIs (Prisma adapter, bcrypt, the Credentials `authorize`) — which produced Vercel build errors. `proxy.ts` defaults to the **Node.js runtime**, sidestepping that constraint. The proxy **inlines** its own copy of the auth config rather than importing `@/auth.config`, so no path alias can drag the Node-only server graph into the gate.
- **`PROTECTED_PREFIXES` is intentionally duplicated** in `src/proxy.ts` **and** `src/auth.config.ts` and must be kept **in lockstep**. If you add/remove a protected route prefix, edit **both** files. (Current value: `["/dashboard", "/questions", "/atlas", "/literature"]`.)

---

## 6. Architecture

### Route groups (`src/app`)

Route groups organise the app by access level without affecting URLs.

| Group | Audience | Routes |
| --- | --- | --- |
| `(marketing)` | Public | `/` (landing) |
| `(auth)` | Public | `/login`, `/register`, `/forgot-password`, `/reset-password` |
| `(app)` | Authenticated students | `/dashboard`, `/questions`, `/questions/[id]`, `/atlas`, `/atlas/[category]`, `/literature`, `/settings` |
| `(admin)` | Admins only | `/admin`, `/admin/questions(/new, /[id]/edit)`, `/admin/atlas(/new, /[id]/edit)`, `/admin/articles(/new, /[id]/edit)`, `/admin/users(/[id])` |

Each group has its own `layout.tsx`. The `(app)` and `(admin)` layouts render the shared app shell; the `(admin)` layout adds a **server-side** admin re-check (defence in depth on top of the proxy gate).

### Auth model

- **Credentials + JWT.** Email/password is verified in the Credentials provider's `authorize` (`src/auth.ts`), which compares with **bcryptjs** (`src/lib/password.ts`). Session strategy is **JWT** — `id`, `position`, `institution`, and `role` are persisted into the token and exposed on the session.
- **Edge-safe split.** `src/auth.config.ts` holds the edge-safe half (pages, JWT strategy, the `authorized` gate, token↔session mapping) and imports **no** Node-only code. `src/auth.ts` is the full server instance — it spreads that config and adds the Prisma adapter + the Credentials provider (which needs the DB). Import `{ auth }` from `src/auth.ts` in Server Components and Server Actions. The proxy keeps its **own inlined copy** of the edge-safe callbacks (see [§5](#authedge-gotchas)).
- **Action-level guards** (`src/lib/auth-guards.ts`). Every server action is an independently-invocable public endpoint, so route/layout gates are **not** sufficient. `requireUser()` throws unless signed in; `requireAdmin()` throws unless the caller is an admin **and re-reads the current role from the database** — this defeats a **stale-JWT** privilege: an admin demoted to `USER` keeps `role: "ADMIN"` in their token until it expires, so the DB re-check is what actually revokes write access. Call these first in every protected action.
- **JWT type-augmentation gotcha.** `src/types/next-auth.d.ts` augments the session/JWT types so `session.user.role` etc. are typed. The `Session` interface lives in `next-auth`, but **`JWT` is declared in `@auth/core/jwt`** — augmenting the `next-auth/jwt` re-export does *not* merge and leaves `token.id` typed as `unknown`. The file targets `@auth/core/jwt` directly; keep it that way if you add token fields.

### The `isCorrect` security boundary

**Invariant — do not break:** the browser must never learn which answer is correct before the user answers.

- The answer-page loader (`src/app/(app)/questions/[id]/page.tsx`) selects choices as **`{ id, text }` only** — `isCorrect` is never read there, so it can never be serialized into client props. `ClientQuestion` is an **explicit allow-list** (every field named, never a spread), so nothing can ride along.
- Correctness is decided **server-side** in the `submitAnswer` action (`src/app/actions/attempts.ts`), which re-reads the stored `Choice` and returns `{ isCorrect, correctChoiceId, explanation }` only after the user submits.
- Analytics (`src/lib/stats.ts`) likewise returns **computed numbers only** — raw `isCorrect` rows and `passwordHash` never leave that module.

When touching the question loader, the answer flow, or stats, preserve this: choices stay `{ id, text }`, correctness stays server-only, `ClientQuestion` stays an explicit allow-list.

### Data model

Defined in `prisma/schema.prisma`. Core models:

- **`User`** — credentials + profile (`position`, `institution`, `passwordHash`, `role: USER | ADMIN`). `Account` / `Session` / `VerificationToken` exist for the Auth.js adapter shape (the credentials + JWT flow does not populate them, but they're ready for adding OAuth later).
- **`Question`** — `stem`, `explanation`, `difficulty`, `category` (`QuestionCategory`). Has many `Choice`, many `QuestionImage`, many `Attempt`. Carries a deprecated `imageUrl` mirror (see [§8](#8-known-limitations--future-hardening)).
- **`Choice`** — `text` + `isCorrect` (server-only; cascade-deleted with its question).
- **`QuestionImage`** — one EEG image per row (`url`, `alt`, `position`), enabling **multiple images per question**. Cascade-deleted with the question.
- **`Attempt`** — one row per answered question (`userId`, `questionId`, `selectedChoiceId`, `isCorrect`). The write-heavy table and the source of truth for progress.
- **`AtlasEntry`** — `title`, `category` (`AtlasCategory: NORMAL_VARIANT | ABNORMAL_VARIANT`), `description`, `imageUrl`.
- **`Article`** — admin-authored literature: required `title` + `summary`, optional `url` (external link-out), `source`, `publishedAt` (free-form string), `imageUrl` (figure).
- **`PasswordResetToken`** — forgot-password flow; stores only the **SHA-256 hash** of the token, single-use (`usedAt`) and time-limited (`expiresAt`).

**Retry model & accuracy** (defined once in `src/lib/stats.ts`): there is **no unique constraint** on `Attempt`, so a user may answer a question many times. To stop accuracy inflation, **accuracy is computed over the LATEST attempt per (user, question)** (by `createdAt`), never over raw attempt counts. `groupBy` can't express "latest row per group," so the codebase reduces in JS via a Map (one `findMany` per view, never per-row). Every screen reads accuracy from this module so the definition can't drift.

### Images

- **Multi-image questions** render as a thumbnail gallery with a focus-trapped, keyboard-navigable **lightbox** on the answer screen; admins author them via a multi-image uploader (questions) or the single-image uploader (atlas, article figures).
- **Uploads** go directly **browser → Vercel Blob** through the admin-gated token route (`src/app/api/admin/upload/route.ts`), constrained to image content types and a max size; the resulting public Blob URL is stored in the DB.
- **Blob cleanup** (`src/lib/blob-cleanup.ts`, `deleteBlobs`) runs **after the DB write commits** and is **best-effort / never throws** (a leaked object is recoverable; a failed user action is worse). Questions and articles clean up their Blobs on image remove/replace/delete. *(Exception: AtlasEntry delete does **not** — see [§8](#8-known-limitations--future-hardening).)*

### Email

Password-reset mail is sent via **Resend** (`src/lib/email.ts`). By default `EMAIL_FROM` is Resend's **sandbox sender**, which delivers **only to the Resend account owner's own address** until you verify a sending domain. The upgrade is a **one-env-var change** to `EMAIL_FROM` (no code change). If `RESEND_API_KEY` is unset, the send path throws a clear runtime error rather than failing silently.

### Cross-cutting patterns worth studying

- **Validate at every trust boundary.** Zod schemas in `src/lib/validations/*` are shared by client forms and server actions, so validation can't drift; actions re-parse input even though the client already validated (the client is never trusted).
- **Singletons for stateful clients.** `src/lib/db.ts` and `src/lib/redis.ts` cache their client on `globalThis` so hot-reload doesn't open a new connection pool on every edit. `redis.ts` is **nullable** — null when `REDIS_URL` is unset.
- **Server actions are the only write path.** All mutations live in `src/app/actions/*`, each guarded and validated.

---

## 7. Scripts & commands

From `package.json`:

```bash
npm run dev          # next dev — local dev server
npm run build        # prisma generate && next build — production build
npm run start        # next start — serve the production build
npm run lint         # next lint

npm run make-admin -- <email>   # promote a registered user to ADMIN (see §4)

npm run db:migrate   # prisma migrate dev — create/apply a migration locally
npm run db:seed      # prisma db seed — runs prisma/seed.ts (LOCAL DEV ONLY)
npm run db:studio    # prisma studio — browse the DB in a GUI
```

Common Prisma commands not aliased in `package.json`:

```bash
npx prisma migrate dev --name <change>   # create + apply a migration (interactive)
npx prisma migrate deploy                # apply pending migrations (CI / production)
npx prisma generate                      # regenerate the client
npx prisma migrate status                # check applied vs. pending migrations
```

> **Seeding is for local development only.** `prisma/seed.ts` inserts illustrative placeholder questions, atlas entries, and a demo account (`demo@eeg.test` / `password123`) so the app is navigable on first run. **Production is intentionally empty** — real clinical content is authored through the admin UI, not seeded. The seeded content is **placeholder, not vetted clinical material**; replace before any real use.

---

## 8. Known limitations & future hardening

An honest list of deferred items so they aren't forgotten:

- **Rate limiting is fail-open and IP-based.** It covers **login and register only**, with no per-account lockout, and is **only enforced when `REDIS_URL` is set** (no Redis → no limiting). Consider per-account throttling and ensuring Redis is provisioned in production.
- **next-auth is pinned to a BETA** (`5.0.0-beta.31`). Track the v5 **stable** release and upgrade off the beta.
- **Unbounded in-memory stat scans.** `src/lib/stats.ts` pulls attempts into memory and reduces in JS (one query per view). Correct and fine at current scale; revisit (DB-side aggregation / `date_trunc` via raw SQL) at large attempt volumes.
- **Image origin allow-list is wide open.** `next.config.ts` allows `remotePatterns: [{ protocol: "https", hostname: "**" }]`. Admin-only authoring caps the practical risk, but tightening to the specific Blob host would be safer.
- **`Question.imageUrl` is DEPRECATED** (kept as a back-compat mirror of the `QuestionImage` relation). A future **Phase-B** migration should drop the column once confirmed unused — and **at the same time** remove the answer-page loader's legacy fallback (synthesizing an image from `imageUrl` when the relation is empty) and the list pages' image-count flooring that exist to support legacy-only rows.
- **AtlasEntry delete does not clean up its Blob.** It predates `deleteBlobs`, so deleting an atlas entry leaves its image object in Blob storage — a known, minor leak. (Questions and articles **do** clean up.) Worth aligning AtlasEntry with the same post-commit cleanup.
- **Password change does not revoke existing sessions.** Because sessions are stateless JWTs, changing a password does **not** invalidate already-issued tokens until they expire. Accepted for now; a `tokenVersion`-style claim would let a password change force re-auth.
- **`package.json#prisma` (the seed hook) is deprecated as of Prisma 7.** It still works on Prisma 6; migrate to a `prisma.config.ts` when upgrading.

---

## 9. License & attribution

Private project (`"private": true` in `package.json`); no open-source license is currently declared. EEG images and clinical content are authored/curated by the project team — ensure any added imagery is appropriately licensed before publishing.
