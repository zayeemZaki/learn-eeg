/**
 * Server-side Blob cleanup for EEG images. Vercel Blob's `del()` removes the
 * underlying object — the DB cascade never touches Blob storage, so without this
 * every removed/replaced/deleted image would orphan a Blob object indefinitely.
 *
 * CRITICAL CONTRACT: callers must invoke this only AFTER the DB write that
 * removed the rows has committed, and it must NEVER throw — the database is the
 * source of truth. A leaked Blob object is recoverable (a later sweep can prune
 * it); a user action that fails because cleanup errored is worse. So every
 * failure here is logged and swallowed.
 */
import { del } from "@vercel/blob";

import { env } from "@/env";

/**
 * Best-effort delete of one or more Blob URLs. Returns nothing and never throws.
 * No-ops when Blob isn't configured (the URLs simply remain — same as today's
 * pre-cleanup behaviour, just explicit).
 */
export async function deleteBlobs(urls: string[]): Promise<void> {
  const targets = urls.filter((u) => u && u.length > 0);
  if (targets.length === 0) return;

  if (!env.BLOB_READ_WRITE_TOKEN) {
    // Not configured for this deploy — nothing we can do; leave the objects.
    return;
  }

  await Promise.all(
    targets.map(async (url) => {
      try {
        await del(url, { token: env.BLOB_READ_WRITE_TOKEN });
      } catch (error) {
        // Log for diagnostics; do NOT propagate — the DB write already succeeded.
        console.error("Blob cleanup failed for", url, error);
      }
    }),
  );
}
