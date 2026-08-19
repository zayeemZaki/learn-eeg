import { Badge } from "@/components/ui/badge";
import { ArticleVideo } from "@/components/ui/article-video";
import { buttonClass } from "@/components/ui/button";
import { resolveArticleLink } from "@/lib/article-link";

interface ArticleMediaProps {
  url: string | null | undefined;
  title: string;
  /** The admin form uses a compact acknowledgement for ordinary URLs. */
  preview?: boolean;
  /** Use a larger action treatment when media appears in a content card. */
  action?: "text" | "button";
  linkLabel?: string;
}

const linkClass =
  "inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]";

/** Render the appropriate article destination without changing stored URLs. */
export function ArticleMedia({
  url,
  title,
  preview = false,
  action = "text",
  linkLabel = "Read the full article",
}: ArticleMediaProps) {
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

  const plainLinkClass = action === "button"
    ? `${buttonClass("ghost", "md", "mt-3 w-fit text-[var(--accent)] hover:text-[var(--accent)]")}`
    : `mt-2 ${linkClass}`;

  return (
    <a href={resolved.url} target="_blank" rel="noopener noreferrer" className={plainLinkClass}>
      {linkLabel}
      <span aria-hidden="true">↗</span>
    </a>
  );
}
