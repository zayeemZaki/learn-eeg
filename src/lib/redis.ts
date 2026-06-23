/**
 * Optional Redis client (backs the login/register rate-limiter).
 *
 * Returns null when REDIS_URL is unset so the app degrades gracefully — the
 * rate-limiter then fails open (no limiting) rather than failing. Same singleton
 * pattern as the Prisma client.
 *
 * HARDENING (a down/misconfigured host must not crash or hammer the process):
 *  - lazyConnect: connect on first command, not eagerly at import — a bad host
 *    can't open a doomed socket just because this module was loaded.
 *  - error listener: ioredis emits `error` on connection trouble; without a
 *    listener an emitted error can become an unhandled exception. We log-and-
 *    swallow — the rate-limiter already fails open, so a Redis outage is benign.
 *  - bounded retryStrategy: cap reconnection attempts (with capped backoff)
 *    instead of ioredis's default infinite reconnect storm. Returning null stops
 *    further retries; the limiter keeps failing open until the process restarts.
 * This is the quick hardening, NOT a provider switch — Redis stays optional and
 * the fail-open limiter behaviour is unchanged.
 */
import Redis from "ioredis";
import { env } from "@/env";

const globalForRedis = globalThis as unknown as { redis?: Redis | null };

/** Stop reconnecting after this many attempts (then the limiter just fails open). */
const MAX_RECONNECT_ATTEMPTS = 5;

function createClient(): Redis | null {
  if (!env.REDIS_URL) return null;
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > MAX_RECONNECT_ATTEMPTS) return null; // give up reconnecting
      return Math.min(times * 200, 2000); // capped backoff: 200ms…2s
    },
  });
  // Never let a connection error bubble up as an unhandled exception; the
  // limiter degrades to fail-open on its own.
  client.on("error", (error) => {
    console.error("Redis client error (rate-limiting degrades to fail-open):", error);
  });
  return client;
}

export const redis = globalForRedis.redis ?? createClient();

if (env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
