/**
 * Shared Auth.js configuration for the SERVER instance (auth.ts).
 *
 * Holds the edge-safe half: pages, the JWT session strategy, the authorization
 * gate, and the token<->session mapping. It must not import Node-only code
 * (Prisma, bcrypt); the Credentials provider's `authorize` (which needs the DB)
 * is added in auth.ts.
 *
 * NOTE: the request-gate proxy (proxy.ts) does NOT import this file — it inlines
 * an identical copy of this config, so its entry stays self-contained and no
 * bundler can follow a path alias from it into the Node-only server graph. If
 * you change the callbacks below, mirror the change in proxy.ts so the proxy
 * guard and the server stay in lockstep.
 */
import type { NextAuthConfig } from "next-auth";

const PROTECTED_PREFIXES = ["/dashboard", "/questions", "/atlas", "/literature"];

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // Bound every stale-JWT window (role/email/account-existence drift) to a week
    // rather than Auth.js's 30-day default. Mirrored in proxy.ts — keep in lockstep.
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  providers: [], // concrete providers are added in auth.ts
  callbacks: {
    /** Route guard consulted by middleware on every matched request. */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);

      // /admin is admin-only. The token now carries `role`, so the gate can be
      // decided at the edge: signed-out users fall through to the signIn page,
      // signed-in non-admins are bounced to their own dashboard. (A second
      // server-side check lives in the (admin) layout — never rely on this
      // alone.)
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
