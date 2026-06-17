/**
 * Authorization guards for server actions.
 *
 * Page/route guards (the (app)/(admin) layouts + the proxy) are defence-in-depth
 * only: every server action is an independently-invocable public endpoint, so it
 * must re-check authorization itself before touching the database. These helpers
 * are that re-check, factored into one place so the rule can't drift between
 * actions (previously each admin action inlined its own identical requireAdmin).
 *
 * Both throw `Error("Unauthorized")` on failure — the correct shape for an action
 * (Next surfaces it as a server error; the client never sees a partial write) —
 * and RETURN the validated session on success so callers get the actor's id
 * without a second `auth()` round-trip.
 */
import type { Session } from "next-auth";

import { auth } from "@/auth";
import { db } from "@/lib/db";

/** Throws unless the caller is signed in. Returns the session. */
export async function requireUser(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Throws unless the caller is a signed-in admin. Returns the session.
 *
 * The session role comes from the JWT minted at login, which can go STALE: an
 * admin demoted to USER keeps `role: "ADMIN"` in their token until it expires.
 * Relying on the token alone would let a former admin keep admin write access.
 * So after the cheap token check we re-read the user's CURRENT role from the DB
 * (one indexed lookup by id, selecting only { role }) and reject if it is no
 * longer ADMIN. Admin mutations are infrequent, so the extra query is cheap; the
 * returned session is unchanged, so all existing call sites keep working.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await auth();
  if (session?.user?.id == null || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Stale-JWT defence: confirm the role is STILL ADMIN in the database.
  const current = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (current?.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  return session;
}
