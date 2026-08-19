import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ArticleReaderCard } from "@/components/ui/article-reader-card";
import { Pager } from "@/components/ui/pager";
import { pageInfo, resolvePage } from "@/lib/pagination";
import { splitContentLinks } from "@/lib/article-link";

const ARTICLES_PER_PAGE = 9;

export default async function LiteraturePage({
  searchParams,
}: {
  // In Next 15+/16, searchParams is async and must be awaited.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const page = resolvePage((await searchParams).page, ARTICLES_PER_PAGE);

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
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {articles.map((article, index) => (
            <li key={article.id} className="flex">
              <ArticleReaderCard
                id={article.id}
                title={article.title}
                // Raw URLs belong to the reader page's media section, not to a
                // three-line card excerpt.
                summary={splitContentLinks(article.summary).text}
                source={article.source}
                publishedAt={article.publishedAt}
                imageUrl={article.imageUrl}
                index={index}
              />
            </li>
          ))}
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
