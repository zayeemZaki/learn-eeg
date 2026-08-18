/**
 * Best-effort, FAIL-OPEN rate limiting backed by the existing optional Redis
 * client (src/lib/redis.ts). Used to blunt online brute-force / credential
 * stuffing on login and account-spam on register.
 *
 * Design:
 *  - Fixed-window counter keyed on route + client IP (e.g. `rl:login:1.2.3.4`).
 *    The first request in a window sets the key with a TTL; subsequent requests
 *    INCR it. Cheap (one round-trip via a pipeline) and good enough to stop
 *    scripted abuse — it is not a precise distributed limiter.
 *  - FAIL-OPEN by design: if Redis is not configured, or any Redis call throws
 *    or hangs, the request is ALLOWED. A cache outage must never lock real users
 *    out of logging in. Every Redis interaction is wrapped so a failure degrades
 *    to "no limiting", exactly as the app already degrades the literature cache.
 *  - The IP the counter is keyed on comes only from headers our own edge sets;
 *    see clientIp() for why the first `x-forwarded-for` hop must never be used.
 *
 * ENV BEHAVIOUR: with no REDIS_URL set, `redis` is null and `rateLimit` always
 * returns `{ allowed: true }` — the app boots and authenticates with no Redis.
 * With REDIS_URL set, limits are enforced.
 */
import { headers } from "next/headers";

import { redis } from "@/lib/redis";

export interface RateLimitRule {
  /** Stable key prefix for this bucket, e.g. "login" → `rl:login:<ip>`. */
  name: string;
  /** Max requests permitted per IP within the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

/** Login: slow online password guessing without hurting normal sign-ins. */
export const LOGIN_RULE: RateLimitRule = {
  name: "login",
  limit: 10,
  windowSeconds: 15 * 60, // 10 attempts / 15 min per IP
};

/** Register: throttle scripted account creation from one source. */
export const REGISTER_RULE: RateLimitRule = {
  name: "register",
  limit: 5,
  windowSeconds: 60 * 60, // 5 sign-ups / hour per IP
};

/**
 * Forgot-password: throttle reset-email requests from one source. The existing
 * per-email throttle only collapses repeats of the SAME address; this caps an
 * attacker spraying many distinct addresses (email-bomb / Resend-quota abuse).
 */
export const FORGOT_PASSWORD_RULE: RateLimitRule = {
  name: "forgot-password",
  limit: 5,
  windowSeconds: 60 * 60, // 5 reset requests / hour per IP
};

/**
 * Email verification (OTP-first registration): throttle code-send requests
 * from one source. Paired with an email-keyed DB count in the OTP action
 * itself (this IP limiter alone doesn't cap one attacker spraying codes to
 * many distinct addresses' worth of Resend spend the way the email check does).
 */
export const OTP_REQUEST_RULE: RateLimitRule = {
  name: "otp-request",
  limit: 5,
  windowSeconds: 60 * 60, // 5 code requests / hour per IP
};

/**
 * Best-effort client IP from request headers.
 *
 * `x-forwarded-for` is APPEND-ONLY and partly client-controlled: a caller can
 * send `X-Forwarded-For: 1.2.3.4` and the platform appends the real address
 * after it, so the FIRST entry is attacker-chosen. Reading it would let anyone
 * defeat every limit below by rotating one header value. The trustworthy entries
 * are the ones our own infrastructure appended, i.e. the END of the list.
 *
 * Preference order:
 *  1. `x-vercel-forwarded-for` — set by Vercel's edge, not forwardable by a
 *     client, so it is the real peer address on our deploy target.
 *  2. `x-real-ip` — set by the terminating proxy (also Vercel-provided).
 *  3. The LAST hop of `x-forwarded-for` — appended by the closest proxy.
 *
 * When none are present (e.g. `next dev` over localhost) we fall back to a
 * constant bucket: the limiter still works logically, but it is NOT a security
 * boundary in that configuration since every caller shares one counter.
 */
async function clientIp(): Promise<string> {
  try {
    const h = await headers();

    const vercel = h.get("x-vercel-forwarded-for")?.trim();
    if (vercel) return vercel;

    const real = h.get("x-real-ip")?.trim();
    if (real) return real;

    const fwd = h.get("x-forwarded-for");
    if (fwd) {
      const hops = fwd.split(",").map((hop) => hop.trim()).filter(Boolean);
      const last = hops.at(-1);
      if (last) return last;
    }
  } catch {
    // headers() unavailable (non-request context) — fall through to default.
  }
  return "unknown";
}

/**
 * Returns `{ allowed }` for the given rule + caller IP. FAIL-OPEN: any absence
 * or failure of Redis yields `{ allowed: true }`. Never throws.
 */
export async function rateLimit(
  rule: RateLimitRule,
): Promise<{ allowed: boolean }> {
  // No Redis configured → no limiting (documented fail-open).
  if (!redis) return { allowed: true };

  try {
    const ip = await clientIp();
    const key = `rl:${rule.name}:${ip}`;

    // Fixed-window counter. INCR returns the new count; on the FIRST request in a
    // window (count === 1) we set the window TTL, so the key auto-expires and the
    // counter resets. INCR + conditional EXPIRE is portable across Redis versions
    // (no EXPIRE NX flag dependency) and keeps strong typing on the chained calls.
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, rule.windowSeconds);
    }

    if (!Number.isFinite(count) || count <= 0) {
      // Unexpected reply — fail open.
      return { allowed: true };
    }
    return { allowed: count <= rule.limit };
  } catch (error) {
    // Redis down / slow / errored — never block the user over a cache outage,
    // but log it: a silent failure here means auth rate limiting is invisibly
    // disabled during an outage.
    console.error(`rateLimit(${rule.name}) failed, failing open:`, error);
    return { allowed: true };
  }
}
