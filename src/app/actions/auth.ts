"use server";

/**
 * Auth server actions. The client never talks to the DB directly — it submits
 * to these, which re-validate input server-side (never trust the client) and
 * own the security-sensitive logic.
 */
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { rateLimit, LOGIN_RULE, REGISTER_RULE } from "@/lib/rate-limit";
import { registerSchema, loginSchema } from "@/lib/validations/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Generic, non-revealing message for a throttled request: it discloses neither
// whether the email exists nor how many attempts remain.
const TOO_MANY = "Too many attempts. Please try again shortly.";

export async function registerUser(raw: unknown): Promise<ActionResult> {
  // Per-IP throttle to blunt scripted account creation. FAIL-OPEN: with no Redis
  // configured (or on any Redis error) this allows the request.
  const { allowed } = await rateLimit(REGISTER_RULE);
  if (!allowed) return { ok: false, error: TOO_MANY };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, email, password, position, institution } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "An account with that email already exists" };
  }

  await db.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      position,
      institution,
    },
  });

  return { ok: true };
}

export async function authenticate(raw: unknown): Promise<ActionResult> {
  // Per-IP throttle to slow online password guessing / credential stuffing.
  // FAIL-OPEN: with no Redis configured (or on any Redis error) this allows the
  // request, so a cache outage never blocks real sign-ins. The generic message
  // matches the "invalid credentials" style and reveals nothing.
  const { allowed } = await rateLimit(LOGIN_RULE);
  if (!allowed) return { ok: false, error: TOO_MANY };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid email or password" };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return { ok: true };
  } catch (error) {
    // signIn signals success via a thrown redirect — let it propagate.
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return { ok: false, error: "Invalid email or password" };
    }
    throw error;
  }
}
