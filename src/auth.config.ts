/**
 * Edge-safe Auth.js configuration.
 *
 * This file must not import Node-only code (Prisma, bcrypt) because it runs in
 * the Edge middleware. It declares pages, the JWT session strategy, the
 * authorization gate for protected routes, and the token<->session mapping.
 * The Credentials provider's `authorize` (which needs the DB) lives in auth.ts.
 */
import type { NextAuthConfig } from "next-auth";

const PROTECTED_PREFIXES = ["/dashboard", "/questions", "/atlas", "/literature"];

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
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
