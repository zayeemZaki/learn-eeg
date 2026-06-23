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
 *
 * SAFETY GATES on the actual `del()` call (the reconcile-by-URL identity logic in
 * the actions is unchanged; only the deletion is gated):
 *  - HOST ALLOW-LIST: only URLs hosted on Vercel Blob are ever passed to del().
 *    Seed / externally-hosted / admin-pasted URLs are skipped — del() does no
 *    host validation, so deleting them would be a wasted call (and a logged error
 *    per foreign URL).
 *  - REFERENCE COUNT: a Blob URL is deleted only when NO row still references it.
 *    URLs are addressable identities, and the same URL can in principle be
 *    referenced by two records (a duplicated/pasted URL). Deleting the object
 *    while another record still points at it would 404 that record's image, so we
 *    count references across QuestionImage.url, Article.imageUrl, and the legacy
 *    Question.imageUrl, and only delete at zero references.
 */
import { del } from "@vercel/blob";

import { env } from "@/env";
import { db } from "@/lib/db";

/** Vercel Blob public object host suffix. */
const VERCEL_BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/** True only for URLs whose host is a Vercel Blob store we own. */
function isVercelBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(VERCEL_BLOB_HOST_SUFFIX);
  } catch {
    // Not a parseable URL → never a Blob object we should delete.
    return false;
  }
}

/**
 * Count how many rows still reference this exact URL across every table that can
 * hold a Blob URL: the per-question gallery (QuestionImage.url), an article's
 * figure (Article.imageUrl), and the legacy single-image column (Question.imageUrl).
 * Zero means the object is safe to delete.
 */
export async function countBlobRefs(url: string): Promise<number> {
  const [galleryRefs, articleRefs, legacyQuestionRefs] = await Promise.all([
    db.questionImage.count({ where: { url } }),
    db.article.count({ where: { imageUrl: url } }),
    db.question.count({ where: { imageUrl: url } }),
  ]);
  return galleryRefs + articleRefs + legacyQuestionRefs;
}

/**
 * Best-effort delete of one or more Blob URLs. Returns nothing and never throws.
 * No-ops when Blob isn't configured (the URLs simply remain — same as today's
 * pre-cleanup behaviour, just explicit). Foreign-host URLs are skipped, and a URL
 * still referenced by any row is preserved (see the SAFETY GATES note above).
 */
export async function deleteBlobs(urls: string[]): Promise<void> {
  // De-dupe, drop empties, and keep only blobs we actually own.
  const targets = [...new Set(urls)].filter((u) => u && isVercelBlobUrl(u));
  if (targets.length === 0) return;

  if (!env.BLOB_READ_WRITE_TOKEN) {
    // Not configured for this deploy — nothing we can do; leave the objects.
    return;
  }

  await Promise.all(
    targets.map(async (url) => {
      try {
        // Reference count is read AFTER the caller's DB write has committed, so a
        // just-removed row no longer counts. Delete only when nothing points here.
        if ((await countBlobRefs(url)) > 0) return;
        await del(url, { token: env.BLOB_READ_WRITE_TOKEN });
      } catch (error) {
        // Log for diagnostics; do NOT propagate — the DB write already succeeded.
        console.error("Blob cleanup failed for", url, error);
      }
    }),
  );
}
