import { getLatestLiterature } from "@/lib/pubmed";
import { Card } from "@/components/ui/card";

// Revalidate the page at most hourly (independent of the Redis cache layer).
export const revalidate = 3600;

export default async function LiteraturePage() {
  const articles = await getLatestLiterature(10);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
        Latest Epilepsy Literature
      </h1>
      <p className="text-sm text-[var(--muted)]">
        Recent epilepsy/EEG publications from PubMed.
      </p>

      {articles.length === 0 ? (
        <p className="text-[var(--muted)]">
          Couldn&apos;t load articles right now. Try again shortly.
        </p>
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
