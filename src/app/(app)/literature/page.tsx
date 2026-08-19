import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { EegImage } from "@/components/ui/eeg-image";
import { ArticleMedia } from "@/components/ui/article-media";
import { Pager } from "@/components/ui/pager";
import { CONTENT_PAGE_SIZE, pageInfo, resolvePage } from "@/lib/pagination";

export default async function LiteraturePage({
  searchParams,
}: {
  // In Next 15+/16, searchParams is async and must be awaited.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const page = resolvePage((await searchParams).page, CONTENT_PAGE_SIZE);

  // Admin-authored articles, newest first. Replaces the former live PubMed feed —
  // the data now lives in the DB (admins create/edit/delete; students read).
  const [articles, totalArticles] = await Promise.all([
    db.article.findMany({
      orderBy: { createdAt: "desc" },
      skip: page.skip,
      take: page.take,
      select: {
        id: true,
        title: true,
        summary: true,
        url: true,
        source: true,
        publishedAt: true,
        imageUrl: true,
      },
    }),
    db.article.count(),
  ]);

  const info = pageInfo(page, totalArticles);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Epilepsy Literature"
        description="Curated epilepsy/EEG reading, selected by the team."
      />

      {articles.length === 0 ? (
        <EmptyState message="No articles yet — check back soon." />
      ) : (
        // A compact feed: one bordered surface with hairline-divided rows. The
        // title is the primary line, "source · published" the muted secondary,
        // then the summary; an optional figure thumbnail and an optional external
        // link-out follow.
        <ul className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {articles.map((article) => {
            const meta = [article.source, article.publishedAt].filter(Boolean).join(" · ");
            return (
              <li
                key={article.id}
                className="flex gap-4 border-b border-[var(--border)] p-4 last:border-0"
              >
                {article.imageUrl ? (
                  // Small framed thumbnail (shared EegImage), alt-texted by title.
                  <div className="w-28 shrink-0">
                    <EegImage src={article.imageUrl} alt={article.title} />
                  </div>
                ) : null}

                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug text-[var(--foreground)]">
                    {article.title}
                  </p>
                  {meta ? (
                    <p className="mt-0.5 text-sm text-[var(--muted)]">{meta}</p>
                  ) : null}
                  <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">
                    {article.summary}
                  </p>

                  <ArticleMedia url={article.url} title={article.title} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pager
        info={info}
        hrefForPage={(p) => `/literature?page=${p}`}
        itemLabel="articles"
      />
    </div>
  );
}
