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
 *
 * THE JWT IS A CACHE, NOT THE TRUTH. Sessions are JWT, so a token outlives the
 * row it describes: the account can be deleted, the role demoted, or the password
 * changed, and the token keeps asserting the old facts until it expires. So both
 * guards do exactly one indexed lookup by id and re-validate the token against
 * the CURRENT row — existence, role (requireAdmin), and the session watermark.
 */
import type { Session } from "next-auth";

import { auth } from "@/auth";
import { db } from "@/lib/db";

/** Where a rejected READ gate sends the visitor. */
export type GateFailure = "signed-out" | "not-admin";

/**
 * True when a token minted at `authTime` predates the user's `sessionsValidFrom`
 * watermark, i.e. credentials changed after this token was issued.
 *
 * A token with NO authTime is treated as revoked: it was minted before the field
 * existed, so we cannot date it, and failing closed just costs those users one
 * re-login. The comparison is `<` on whole milliseconds — a token minted in the
 * same millisecond as the bump is kept, which is only reachable by the very
 * request that performed the bump.
 */
function isSessionRevoked(
  authTime: number | undefined,
  sessionsValidFrom: Date,
): boolean {
  if (authTime == null) return true;
  return authTime < sessionsValidFrom.getTime();
}

/**
 * Throws unless the caller is signed in, their account still exists, and their
 * session has not been revoked by a credential change. Returns the session.
 */
export async function requireUser(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Stale-JWT defence: the account must still exist, and the token must not
  // predate a credential change (password change / reset).
  const current = await db.user.findUnique({
    where: { id: session.user.id },
    select: { sessionsValidFrom: true },
  });
  if (!current) {
    throw new Error("Unauthorized");
  }
  if (isSessionRevoked(session.user.authTime, current.sessionsValidFrom)) {
    throw new Error("Unauthorized");
  }

  return session;
}

/**
 * Throws unless the caller is a signed-in admin whose session is still valid.
 * Returns the session.
 *
 * The session role comes from the JWT minted at login, which can go STALE: an
 * admin demoted to USER keeps `role: "ADMIN"` in their token until it expires.
 * Relying on the token alone would let a former admin keep admin write access.
 * So after the cheap token check we re-read the user's CURRENT role from the DB
 * (one indexed lookup by id) and reject if it is no longer ADMIN — and apply the
 * same session-revocation check as requireUser. Admin mutations are infrequent,
 * so the extra query is cheap; the returned session is unchanged, so all existing
 * call sites keep working.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await auth();
  if (session?.user?.id == null || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const current = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, sessionsValidFrom: true },
  });
  if (current?.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  if (isSessionRevoked(session.user.authTime, current.sessionsValidFrom)) {
    throw new Error("Unauthorized");
  }

  return session;
}

/**
 * READ-side counterpart to the guards above, for layouts.
 *
 * The action guards throw "Unauthorized" — right for a mutation, wrong for a page
 * render, where the correct outcome is a redirect. So layouts call this instead:
 * it applies the SAME current-row checks (existence, role, session watermark) and
 * returns either the validated session or the reason it failed, leaving the
 * redirect target to the caller.
 *
 * @param requireAdminRole when true, a non-admin fails with "not-admin".
 */
export async function checkPageAccess(
  requireAdminRole = false,
): Promise<
  { ok: true; session: Session } | { ok: false; reason: GateFailure }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, reason: "signed-out" };
  }
  if (requireAdminRole && session.user.role !== "ADMIN") {
    return { ok: false, reason: "not-admin" };
  }

  const current = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, sessionsValidFrom: true },
  });
  if (!current) {
    return { ok: false, reason: "signed-out" };
  }
  // A revoked token is not "signed in" any more, whatever it still asserts.
  if (isSessionRevoked(session.user.authTime, current.sessionsValidFrom)) {
    return { ok: false, reason: "signed-out" };
  }
  if (requireAdminRole && current.role !== "ADMIN") {
    return { ok: false, reason: "not-admin" };
  }

  return { ok: true, session };
}
