/**
 * The edge-safe half of the Auth.js configuration — the SINGLE source of truth
 * for it, consumed by BOTH entries:
 *   - src/auth.ts    (full server instance: adds the Prisma adapter + Credentials)
 *   - src/proxy.ts   (the request gate)
 *
 * WHY THIS FILE EXISTS: proxy.ts used to inline a hand-maintained COPY of this
 * config, with comments in both files asking future readers to keep the two "in
 * lockstep". That is drift by design — a route added to PROTECTED_PREFIXES or a
 * changed callback silently applies on only one side, and the two sides are the
 * read gate and the write gate. The original reason for the copy was the Edge
 * runtime's bundler statically rejecting anything reachable from the proxy entry
 * that touched Node APIs. Next.js 16's `proxy` convention runs on the Node
 * runtime, so that constraint is gone.
 *
 * THE ONE RULE FOR THIS FILE: it must import NOTHING app-local — no @/lib/db, no
 * @/lib/password, no @/auth. Only types and `next-auth` itself. The Node-only
 * pieces (Prisma adapter, bcrypt, the Credentials `authorize`) are added in
 * auth.ts, which is never reachable from the proxy entry. Keep it that way and
 * neither bundler can follow a path from the proxy into the server graph.
 */
import type { NextAuthConfig } from "next-auth";

/** Route prefixes that require a signed-in user. */
const PROTECTED_PREFIXES = ["/dashboard", "/questions", "/atlas", "/literature"];

/**
 * Bound every stale-JWT window (role/email/account-existence drift) to a week
 * rather than Auth.js's 30-day default.
 */
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  providers: [], // concrete providers are added in auth.ts, never in the proxy
  callbacks: {
    /** Route guard consulted by the proxy on every matched request. */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);

      // /admin is admin-only. The token carries `role`, so the gate can be
      // decided here: signed-out users fall through to the signIn page,
      // signed-in non-admins are bounced to their own dashboard. (A second
      // server-side check lives in the (admin) layout — never rely on this
      // alone, since the token's role can be stale.)
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
    /**
     * Persist domain fields into the JWT at sign-in.
     *
     * `authTime` is the session-invalidation watermark: the moment this token was
     * minted. requireUser/requireAdmin compare it against the user's
     * `sessionsValidFrom` column, so bumping that column (on any credential
     * change) invalidates every token issued before the bump. It is stamped ONLY
     * on the sign-in pass (when `user` is present) and never refreshed, so it
     * genuinely dates the token.
     */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.position = user.position;
        token.institution = user.institution;
        token.role = user.role;
        token.authTime = Date.now();
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
        session.user.authTime = token.authTime;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
