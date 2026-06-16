# EEG Practice Center

A practice platform for neurology trainees: an EEG question bank, an atlas of
normal/abnormal variants, and a live feed of recent epilepsy literature.

This README doubles as an architecture walkthrough — read it top to bottom and
the codebase should make sense layer by layer.

## Stack

| Concern        | Choice                         | Why                                                            |
| -------------- | ------------------------------ | -------------------------------------------------------------- |
| Framework      | Next.js 16 (App Router)        | Server Components + Server Actions keep data access on the server |
| Language       | TypeScript (strict)            | Types are the cheapest documentation                          |
| Database       | PostgreSQL + Prisma 6          | Data is relational (users → attempts → questions); ORM gives typed queries |
| Auth           | Auth.js v5 (credentials + JWT) | You own the session flow rather than hiding it behind a SaaS  |
| Cache          | Redis (optional)               | Caches the external literature feed; app works without it     |
| Styling        | Tailwind CSS v4                | Minimal, co-located styling                                   |

## Prerequisites

- Node.js 20+
- A PostgreSQL database (local Docker, Neon, Supabase, etc.)
- (Optional) a Redis instance for literature caching

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # then fill in DATABASE_URL
npx auth secret             # writes AUTH_SECRET into .env

# 3. Create the database schema and the typed client
npm run db:migrate          # prisma migrate dev (also runs `prisma generate`)

# 4. Seed demo content + a demo account
npm run db:seed
#    demo login → demo@eeg.test / password123

# 5. Run it
npm run dev                 # http://localhost:3000
```

> The repo ships without a generated Prisma client. `npm run db:migrate` (or
> `npx prisma generate`) creates it; until then your editor will flag missing
> `@prisma/client` exports. That is expected.

## How the app is organised

```
src/
├── env.ts                  # validated environment access (fail fast on misconfig)
├── auth.config.ts          # EDGE-SAFE auth config (runs in middleware)
├── auth.ts                 # full auth instance: adapter + credentials authorize
├── middleware.ts (root)    # route guard at the edge
├── lib/
│   ├── db.ts               # Prisma singleton
│   ├── redis.ts            # Redis singleton (nullable)
│   ├── password.ts         # bcrypt hash/verify
│   ├── pubmed.ts           # literature read-service + cache
│   └── validations/auth.ts # zod schemas shared by client + server
├── types/next-auth.d.ts    # session/JWT type augmentation
├── components/ui/          # Button / Field / Card primitives
└── app/
    ├── (marketing)/        # public welcome page
    ├── (auth)/             # login + register
    ├── (app)/              # protected dashboard + four sections
    ├── actions/            # server actions (the only write path)
    └── api/auth/[...nextauth]/route.ts
```

Route groups (`(marketing)`, `(auth)`, `(app)`) organise the app by access level
without affecting URLs.

## The patterns worth studying

**1. The edge-safe auth split.** Auth.js runs your `authorized` callback inside
Edge middleware, which cannot run Node APIs (Prisma, bcrypt). So the config is
split: `auth.config.ts` holds only edge-safe pieces (pages, JWT strategy, the
route guard, token↔session mapping), and `auth.ts` adds the Prisma adapter and
the Credentials `authorize` that touches the database. `middleware.ts`
instantiates Auth.js from the edge-safe config alone.

**2. The JWT augmentation gotcha.** We attach `position`/`institution` to the
token and surface them on `session.user`. For TypeScript to know about them,
`types/next-auth.d.ts` augments two interfaces. The `Session` interface lives in
`next-auth`, but `JWT` is declared in **`@auth/core/jwt`** — augmenting the
`next-auth/jwt` re-export does *not* merge, leaving `token.id` typed as
`unknown`. This is a common silent bug; we target `@auth/core/jwt` directly.

**3. The server/client boundary is a security boundary.** In
`app/(app)/questions/page.tsx` the server fetches each `Choice` selecting only
`{ id, text }` — never `isCorrect`. The answer key never reaches the browser.
Correctness is decided server-side in `actions/attempts.ts` and returned only
*after* the user answers. Whenever data is sensitive, the page→component prop is
the place to strip it.

**4. Validate at every trust boundary.** `lib/validations/auth.ts` defines zod
schemas used by both the client form and the server action, so validation can't
drift. Server actions re-parse input even though the client already validated —
the client is never trusted.

**5. Singletons for stateful clients.** `db.ts` and `redis.ts` cache their
client on `globalThis` so Next's hot-reload doesn't open a new connection pool
on every edit.

**6. Graceful degradation.** `lib/pubmed.ts` time-bounds every call, caches in
Redis when available, and returns an empty list on any failure rather than
throwing — so a PubMed outage renders an empty state instead of a 500.

## Extending it

- **Add OAuth (Google/GitHub):** add the provider to `auth.ts`. The
  `Account`/`Session` tables already exist for it.
- **Add real content:** write to `Question`/`Choice`/`AtlasEntry` via a seed
  script or an admin route. Keep content seedable and separate from app logic.
- **Atlas images:** placeholders point at `placehold.co`. Swap `imageUrl` for an
  object-storage URL (S3 / Vercel Blob) and narrow `next.config.ts`
  `images.remotePatterns` to that host.

## Known caveats

- The seeded questions, explanations, and atlas entries are **placeholder
  content**, not vetted clinical material. Replace before any real use.
- `package.json#prisma` (the seed hook) is deprecated as of Prisma 7; on Prisma
  6 it still works. Migrate to `prisma.config.ts` when you upgrade.
