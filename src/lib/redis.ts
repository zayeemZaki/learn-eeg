/**
 * Optional Redis client (used to cache the PubMed feed).
 *
 * Returns null when REDIS_URL is unset so the app degrades gracefully to live
 * fetching rather than failing. Same singleton pattern as the Prisma client.
 */
import Redis from "ioredis";
import { env } from "@/env";

const globalForRedis = globalThis as unknown as { redis?: Redis | null };

function createClient(): Redis | null {
  if (!env.REDIS_URL) return null;
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
}

export const redis = globalForRedis.redis ?? createClient();

if (env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
