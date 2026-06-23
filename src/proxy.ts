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
 * The Auth.js config is still inlined here (rather than imported from
 * @/auth.config) so this entry stays self-contained: no `@/*` cross-import that
 * a bundler could follow into the Node-only server graph (Prisma adapter,
 * bcrypt, the Credentials `authorize`). The full server instance — adapter +
 * Credentials provider — lives in auth.ts and consumes @/auth.config.
 *
 * The callbacks below are the edge-safe half of auth.config.ts (pages, JWT
 * strategy, the route guard, the token<->session mapping) and contain NO
 * Node-only code. If you change them, mirror the change in auth.config.ts so the
 * proxy guard and the server stay in lockstep.
 */
import NextAuth, { type NextAuthConfig } from "next-auth";

const PROTECTED_PREFIXES = ["/dashboard", "/questions", "/atlas", "/literature"];

const proxyAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // Mirror auth.config.ts: bound the stale-JWT window to 7 days (Auth.js
    // defaults to 30). Keep in lockstep with auth.config.ts.
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  providers: [], // concrete providers are added in auth.ts, never in the proxy
  callbacks: {
    /** Route guard consulted on every matched request. */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);

      // /admin is admin-only. The token carries `role`, so the gate is decided
      // here: signed-out users fall through to the signIn page, signed-in
      // non-admins are bounced to their own dashboard. (A second server-side
      // check lives in the (admin) layout — never rely on this alone.)
      if (nextUrl.pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false; // → /login
        if (auth!.user.role === "ADMIN") return true;
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      const isProtected = PROTECTED_PREFIXES.some((prefix) =>
        nextUrl.pathname.startsWith(prefix),
      );

      if (isProtected) return isLoggedIn; // redirects to signIn page if false
      return true;
    },
    /** Persist domain fields into the JWT at sign-in. */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.position = user.position;
        token.institution = user.institution;
        token.role = user.role;
      }
      return token;
    },
    /** Expose those fields to the client/server session object. */
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.position = token.position;
        session.user.institution = token.institution;
        session.user.role = token.role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

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
const { auth } = NextAuth(proxyAuthConfig);

export default auth(() => {
  // Authorized request — fall through and let it proceed.
});

export const config = {
  // Match everything except static assets and the auth API.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
