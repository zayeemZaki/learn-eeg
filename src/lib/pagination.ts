/**
 * Server-side pagination — the shared contract for every list in the app.
 *
 * WHY: the lists were all unbounded `findMany()` calls. That is fine at seed size
 * and quietly becomes the app's first outage: every question / article / attempt
 * row crosses the wire into a server component on every render. Bounding them now
 * costs one `take` and one `skip`; retrofitting it after the question bank grows
 * means doing it under pressure.
 *
 * OFFSET, NOT CURSOR: these lists are admin/browse views over stable, mostly-append
 * data, reached by page number and shared as URLs, so `skip`/`take` is the right
 * fit — it supports "page 4" and a total count, which a cursor cannot express
 * without extra state. The known trade-off is that deep offsets scan; if any list
 * grows past tens of thousands of rows, or gains high-frequency inserts that would
 * make a page boundary shift under the reader, that list should move to a cursor.
 *
 * The page number lives in the URL (?page=N), like every other filter here, so a
 * paginated view stays server-rendered, shareable, and works without JavaScript.
 */

/** Rows per page for admin list views. */
export const ADMIN_PAGE_SIZE = 50;

/** Rows per page for the reader-facing lists (questions, literature). */
export const CONTENT_PAGE_SIZE = 25;

/** A resolved page request: what to query, and what page we are on. */
export interface Page {
  /** 1-based page number, always >= 1. */
  page: number;
  /** Rows to fetch — pass straight to Prisma's `take`. */
  take: number;
  /** Rows to skip — pass straight to Prisma's `skip`. */
  skip: number;
}

/**
 * Parse a `?page=` search param into a safe query window.
 *
 * Hostile or fat-fingered input (`0`, `-3`, `abc`, `1e9`, an array from a repeated
 * param) all collapse to page 1 rather than throwing or, worse, producing a
 * negative `skip` that Prisma would reject at runtime. Clamping here means no call
 * site has to think about it.
 */
export function resolvePage(
  raw: string | string[] | undefined,
  pageSize: number,
): Page {
  const first = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(first);
  const page =
    Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : 1;

  return { page, take: pageSize, skip: (page - 1) * pageSize };
}

/** What the pager component needs to render itself. */
export interface PageInfo {
  page: number;
  totalPages: number;
  totalRows: number;
  /** Row range shown on this page, 1-based and inclusive — e.g. "51–75 of 320". */
  from: number;
  to: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * Derive display/navigation state from a resolved page plus the total row count.
 *
 * An empty list is one page, not zero, so the UI never renders "page 1 of 0". A
 * page beyond the end (a stale link, or rows deleted since) reports honestly
 * rather than pretending to be in range — the caller shows its empty state and the
 * pager still offers a way back.
 */
export function pageInfo(
  { page, take }: Page,
  totalRows: number,
): PageInfo {
  const totalPages = Math.max(1, Math.ceil(totalRows / take));
  const from = totalRows === 0 ? 0 : (page - 1) * take + 1;
  const to = Math.min(page * take, totalRows);

  return {
    page,
    totalPages,
    totalRows,
    from,
    to: Math.max(to, 0),
    hasPrevious: page > 1,
    hasNext: page < totalPages,
  };
}
