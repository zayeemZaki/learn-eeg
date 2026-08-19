import { Badge } from "@/components/ui/badge";
import { ArticleVideo } from "@/components/ui/article-video";
import { resolveArticleLink } from "@/lib/article-link";

interface ArticleMediaProps {
  url: string | null | undefined;
  title: string;
  /** The admin form uses a compact acknowledgement for ordinary URLs. */
  preview?: boolean;
}

const linkClass =
  "inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]";

/** Render the appropriate article destination without changing stored URLs. */
export function ArticleMedia({ url, title, preview = false }: ArticleMediaProps) {
  const resolved = url ? resolveArticleLink(url) : null;
  if (!resolved) return null;

  if (resolved.kind === "youtube" || resolved.kind === "vimeo") {
    return (
      <div className={preview ? "mt-2 max-w-md" : "mt-3 max-w-xl"}>
        <ArticleVideo
          title={title}
          embedUrl={resolved.embedUrl}
          watchUrl={resolved.watchUrl}
          thumbnailUrl={resolved.kind === "youtube" ? resolved.thumbnailUrl : undefined}
        />
      </div>
    );
  }

  if (resolved.kind === "pubmed" || resolved.kind === "doi") {
    const label = resolved.kind === "pubmed" ? `PMID ${resolved.pmid}` : `DOI ${resolved.doi}`;
    return (
      <a
        href={resolved.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex outline-none ${preview ? "mt-2" : "mt-3"} focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]`}
      >
        <Badge tone="neutral">{label}</Badge>
      </a>
    );
  }

  if (preview) {
    return <Badge tone="neutral" className="mt-2">Link</Badge>;
  }

  // Keep the existing ordinary link-out presentation exactly intact.
  return (
    <a href={resolved.url} target="_blank" rel="noopener noreferrer" className={`mt-2 ${linkClass}`}>
      Read the full article
      <span aria-hidden="true">↗</span>
    </a>
  );
}
