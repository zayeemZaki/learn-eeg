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
 * Best-effort client IP from request headers. On Vercel the first hop of
 * `x-forwarded-for` is the real client; `x-real-ip` is a fallback. When neither
 * is present (e.g. local dev) we use a constant bucket so the limiter still
 * functions logically without throwing.
 */
async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) {
      const first = fwd.split(",")[0]?.trim();
      if (first) return first;
    }
    const real = h.get("x-real-ip");
    if (real) return real.trim();
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
  } catch {
    // Redis down / slow / errored — never block the user over a cache outage.
    return { allowed: true };
  }
}
