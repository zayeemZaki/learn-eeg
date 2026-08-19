import Link from "next/link";

import { ArticleFigure } from "@/components/ui/article-figure";
import { ChevronRightIcon } from "@/components/ui/icons";

interface ArticleReaderCardProps {
  id: string;
  title: string;
  summary: string;
  source: string | null;
  publishedAt: string | null;
  imageUrl: string | null;
  /** Position in the list, used to stagger the entrance animation. */
  index?: number;
}

/**
 * One article in the literature feed. The WHOLE card is the link — there is no
 * separate open button, so the tap target is the card itself and nothing
 * interactive nests inside the anchor (which would break middle-click and
 * open-in-new-tab).
 *
 * The figure is optional; EegImage already renders a framed placeholder when an
 * article has none, so every card keeps the same silhouette and the grid never
 * goes ragged.
 */
export function ArticleReaderCard({
  id,
  title,
  summary,
  source,
  publishedAt,
  imageUrl,
  index = 0,
}: ArticleReaderCardProps) {
  const meta = [source, publishedAt].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/literature/${id}`}
      // The stagger delay is per-card data, not a design token, so it rides in
      // as an inline custom property the `content-rise` animation reads.
      style={{ "--stagger": `${Math.min(index, 8) * 60}ms` } as React.CSSProperties}
      className="literature-card content-rise group flex h-full w-full flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xs outline-none transition duration-200 hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] motion-safe:hover:-translate-y-0.5"
    >
      {/* Decorative: the title below already names the article, so the figure
          is never the thing a screen reader announces for this link. Articles
          without an uploaded image get a generated trace, not an empty box. */}
      <div aria-hidden="true" className="overflow-hidden border-b border-[var(--border)]">
        <ArticleFigure src={imageUrl} seed={id} alt="" className="literature-figure rounded-none border-0" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        {meta ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{meta}</p>
        ) : null}
        <h2 className="mt-2 line-clamp-2 text-balance font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight text-[var(--foreground)]">
          {title}
        </h2>
        {summary ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--muted)]">{summary}</p>
        ) : null}
        <span className="mt-4 inline-flex items-center gap-1 pt-1 text-sm font-medium text-[var(--accent)]">
          Read article
          <ChevronRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
