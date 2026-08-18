/**
 * Request-gate proxy (Next.js 16's renamed `middleware`).
 *
 * Runs the Auth.js `authorized` callback on every matched route, redirecting
 * unauthenticated users away from protected pages — and non-admins away from
 * /admin — before any server component renders.
 *
 * WHY THIS FILE IS `proxy.ts`, NOT `middleware.ts`:
 * Next.js 16 renamed the `middleware` file convention to `proxy` and the export
 * from `middleware` to `proxy`. The deprecated `middleware` convention defaulted
 * to the Edge runtime, whose bundler statically rejected anything reachable from
 * the entry that touched Node APIs — which is what produced the Vercel build
 * error ("referencing unsupported modules: @/auth.config"). `proxy` defaults to
 * the Node.js runtime, so that Edge-only constraint no longer applies.
 *
 * The config is IMPORTED from @/auth.shared (not inlined) precisely because the
 * Node runtime lifts that constraint: auth.shared.ts deliberately imports nothing
 * app-local, so no bundler can follow a path from this entry into the Node-only
 * server graph (Prisma adapter, bcrypt, the Credentials `authorize`). The full
 * server instance — adapter + Credentials provider — lives in auth.ts, which is
 * never reachable from here.
 */
import NextAuth from "next-auth";

import { authConfig } from "@/auth.shared";

// Next 16's proxy loader requires the entry to export a *function* (default or
// named `proxy`); it statically rejects a destructured const binding like
// `export const { auth: proxy } = ...`. So we take Auth.js's `auth` wrapper and
// default-export it around a no-op handler.
//
// In this form Auth.js runs the `authorized` callback FIRST: if it returns
// `false` or a `Response` (our /admin → /dashboard redirect, or the signIn
// redirect), that decision is enforced and the wrapped function never runs. The
// body therefore only executes for already-authorized requests, where doing
// nothing lets the request continue. (Pattern per Auth.js docs:
// `export default auth((req) => { ... })`.)
const { auth } = NextAuth(authConfig);

export default auth(() => {
  // Authorized request — fall through and let it proceed.
});

export const config = {
  // Match everything except static assets and the auth API.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
