import { getLatestLiterature } from "@/lib/pubmed";
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
        // A compact feed, not eight tall cards: one bordered surface with hairline
        // divided rows. Each row is the link; the title is the primary line and
        // "journal · date" the muted secondary line.
        <ul className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {articles.map((article) => (
            <li key={article.pmid} className="border-b border-[var(--border)] last:border-0">
              <a
                href={article.url}
                target="_blank"
                rel="noreferrer"
                className="block px-4 py-3 outline-none transition-colors hover:bg-[var(--background)] focus-visible:bg-[var(--background)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
              >
                <p className="font-medium leading-snug text-[var(--foreground)]">{article.title}</p>
                <p className="mt-0.5 text-sm text-[var(--muted)]">
                  {article.journal}
                  {article.pubDate ? ` · ${article.pubDate}` : ""}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
