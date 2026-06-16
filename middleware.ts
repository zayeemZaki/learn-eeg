/**
 * Runs the `authorized` callback (auth.config.ts) on matched routes at the edge,
 * redirecting unauthenticated users away from protected pages before any server
 * component renders.
 */
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Match everything except static assets and the auth API.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
