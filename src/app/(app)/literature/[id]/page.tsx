import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ArticleFigure } from "@/components/ui/article-figure";
import { ArticleMedia } from "@/components/ui/article-media";
import { splitContentLinks } from "@/lib/article-link";

/**
 * Full reader page for one admin-authored literature article.
 *
 * Laid out as a proper reading surface rather than a form dump: an accent-washed
 * hero carries the meta line and the title, the figure sits between hero and
 * body, and the summary is set on a constrained measure through `.article-prose`
 * (paragraph rhythm and lead-paragraph treatment live in CSS, so this component
 * only splits the authored text on blank lines).
 *
 * Links are stripped out of the body and surfaced as their own "Sources &
 * media" block, so a raw URL never sits mid-sentence.
 */
export default async function LiteratureArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await db.article.findUnique({
    where: { id },
    select: {
      title: true,
      summary: true,
      url: true,
      source: true,
      publishedAt: true,
      imageUrl: true,
    },
  });
  if (!article) notFound();

  const summary = splitContentLinks(article.summary);
  const paragraphs = summary.text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const mediaUrls = [...new Set([article.url, ...summary.urls].filter((url): url is string => Boolean(url)))];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="Literature" back={{ href: "/literature", label: "Back to literature" }} />

      <article className="content-rise overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <header className="article-hero relative overflow-hidden border-b border-[var(--border)] px-6 py-8 sm:px-10 sm:py-10">
          {/* The same faint strip-chart paper as the marketing hero, purely
              decorative and masked to fade before it reaches the title. */}
          <div aria-hidden="true" className="eeg-grid pointer-events-none absolute inset-0" />
          <div className="relative flex flex-col gap-3">
            {article.source || article.publishedAt ? (
              <div className="flex flex-wrap items-center gap-2">
                {article.source ? <Badge tone="accent">{article.source}</Badge> : null}
                {article.publishedAt ? (
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {article.publishedAt}
                  </span>
                ) : null}
              </div>
            ) : null}
            <h1 className="text-balance font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight tracking-tight text-[var(--foreground)] sm:text-4xl">
              {article.title}
            </h1>
          </div>
        </header>

        {/* Always present: ArticleFigure draws a generated trace when the
            article has no uploaded image, so the reader never opens on a bare
            block of text. */}
        <figure className="border-b border-[var(--border)]">
          <ArticleFigure
            src={article.imageUrl}
            seed={id}
            alt={`Figure for ${article.title}`}
            className="rounded-none border-0" />
        </figure>

        <div className="px-6 py-8 sm:px-10 sm:py-10">
          {paragraphs.length > 0 ? (
            <div className="article-prose max-w-prose">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="whitespace-pre-wrap">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : null}

          {mediaUrls.length > 0 ? (
            <section
              aria-labelledby="article-sources"
              // No gap: ArticleMedia carries its own top margin per variant, so
              // an extra flex gap would double the spacing between entries.
              className={`flex flex-col border-t border-[var(--border)] pt-6 ${
                paragraphs.length > 0 ? "mt-8" : ""
              }`}
            >
              <h2
                id="article-sources"
                className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
              >
                Sources &amp; media
              </h2>
              {mediaUrls.map((url) => (
                <ArticleMedia key={url} url={url} title={article.title} action="button" />
              ))}
            </section>
          ) : null}
        </div>
      </article>
    </div>
  );
}
