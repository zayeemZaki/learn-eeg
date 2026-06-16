import { getLatestLiterature } from "@/lib/pubmed";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

// Revalidate the page at most hourly (independent of the Redis cache layer).
export const revalidate = 3600;

export default async function LiteraturePage() {
  const articles = await getLatestLiterature(10);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Latest Epilepsy Literature"
        description="Recent epilepsy/EEG publications from PubMed."
      />

      {articles.length === 0 ? (
        <EmptyState message="Couldn't load articles right now. Try again shortly." />
      ) : (
        <div className="flex flex-col gap-3">
          {articles.map((article) => (
            <a key={article.pmid} href={article.url} target="_blank" rel="noreferrer">
              <Card className="transition hover:border-[var(--accent)]">
                <h2 className="font-medium">{article.title}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {article.journal}
                  {article.pubDate ? ` · ${article.pubDate}` : ""}
                </p>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
