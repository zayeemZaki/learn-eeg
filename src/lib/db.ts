/**
 * Prisma client singleton.
 *
 * Next.js hot-reload re-evaluates modules, which would otherwise spawn a new
 * PrismaClient (and a new connection pool) on every change. Caching on
 * globalThis keeps a single instance in development.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
