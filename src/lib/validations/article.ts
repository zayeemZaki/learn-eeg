/**
 * Article validation — the single source of truth shared by the admin
 * ArticleForm (client) and the admin server actions, so the rules can never
 * drift between the two. The server actions re-parse with this schema; never
 * trust the client. Mirrors the style of atlas.ts.
 *
 * An admin-authored article is SELF-CONTAINED: `title` + `summary` are required
 * (it is meaningful with no external dependency). The link-out (`url`), the
 * `source`, the `publishedAt` date, and the figure (`imageUrl`) are all OPTIONAL.
 * `publishedAt` is a free-form string so partial dates ("2024 Mar") are allowed
 * without a date picker. Empty optional strings normalise to undefined so the DB
 * stores null rather than "".
 */
import { z } from "zod";

// Optional URL: a valid URL, or an empty string (untouched form field) which
// normalises to undefined → stored as null. Mirrors the empty-string handling on
// the deprecated question imageUrl.
const optionalUrl = z
  .union([z.string().url("Enter a valid URL"), z.literal(""), z.null()])
  .transform((v) => (v ? v : undefined))
  .optional();

// Optional free text: trimmed, empty → undefined (→ null in the DB).
const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .transform((v) => (v ? v : undefined))
    .optional();

export const articleSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  summary: z.string().trim().min(1, "Summary is required").max(4000),
  // Optional external link-out (PubMed / journal).
  url: optionalUrl,
  // Optional journal / publisher and free-form publish date.
  source: optionalText(200),
  publishedAt: optionalText(100),
  // Optional figure — a valid Blob URL or nothing.
  imageUrl: optionalUrl,
});

export type ArticleInput = z.infer<typeof articleSchema>;
