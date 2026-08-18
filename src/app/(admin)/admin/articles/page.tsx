import Link from "next/link";

import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Pager } from "@/components/ui/pager";
import { ADMIN_PAGE_SIZE, pageInfo, resolvePage } from "@/lib/pagination";
import { Badge } from "@/components/ui/badge";
import { ImageIcon } from "@/components/ui/icons";

export const metadata = { title: "Literature" };

interface ArticleRow {
  id: string;
  title: string;
  source: string | null;
  publishedAt: string | null;
  hasLink: boolean;
  hasImage: boolean;
}

/**
 * Admin literature list: every article with its title, source, publish date, and
 * has-link / has-image indicators, plus a "New article" button. The whole row
 * links to the editor; deletion lives on that edit page (a trash-icon "Danger
 * zone"), so the list carries no per-row delete. Rendered through the shared
 * DataTable (stacked cards on mobile, a scrollable table from sm up).
 *
 * Two queries: one paginated findMany ordered newest-first, and one total count
 * for the pager. Reading nothing sensitive; this is an admin-only view (the /admin
 * layout + proxy already gate it).
 */
export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const page = resolvePage((await searchParams).page, ADMIN_PAGE_SIZE);

  const [articles, totalArticles] = await Promise.all([
    db.article.findMany({
      orderBy: { createdAt: "desc" },
      skip: page.skip,
      take: page.take,
      select: {
        id: true,
        title: true,
        source: true,
        publishedAt: true,
        url: true,
        imageUrl: true,
      },
    }),
    db.article.count(),
  ]);

  const info = pageInfo(page, totalArticles);

  const rows: ArticleRow[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    source: a.source,
    publishedAt: a.publishedAt,
    hasLink: Boolean(a.url),
    hasImage: Boolean(a.imageUrl),
  }));

  const dash = (
    <span className="text-[var(--muted)]" aria-label="None">
      —
    </span>
  );

  const columns: Column<ArticleRow>[] = [
    {
      header: "Title",
      className: "max-w-md",
      cell: (a) => (
        <span className="line-clamp-2 font-medium text-[var(--foreground)]">{a.title}</span>
      ),
    },
    { header: "Source", cell: (a) => (a.source ? <span className="text-[var(--muted)]">{a.source}</span> : dash) },
    {
      header: "Published",
      cell: (a) => (a.publishedAt ? <span className="tabular-nums text-[var(--muted)]">{a.publishedAt}</span> : dash),
    },
    {
      header: "Link",
      align: "center",
      cell: (a) =>
        a.hasLink ? (
          <span className="text-[var(--muted)]">↗<span className="sr-only">Has external link</span></span>
        ) : (
          dash
        ),
    },
    {
      header: "Image",
      align: "center",
      cell: (a) =>
        a.hasImage ? (
          <span className="inline-flex items-center text-[var(--muted)]">
            <ImageIcon />
            <span className="sr-only">Has image</span>
          </span>
        ) : (
          dash
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Literature"
        description={`${totalArticles.toLocaleString()} ${
          totalArticles === 1 ? "article" : "articles"
        }.`}
        actions={
          <Link href="/admin/articles/new">
            <Button>New article</Button>
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState message="No articles yet. Create the first one." />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(a) => a.id}
          rowHref={(a) => `/admin/articles/${a.id}/edit`}
          rowLabel={(a) => `Edit ${a.title}`}
          renderCard={(a) => (
            // The whole card is the tap target → edit; deletion lives on the edit
            // page, so the card carries no delete control.
            <Card>
              <Link
                href={`/admin/articles/${a.id}/edit`}
                aria-label={`Edit ${a.title}`}
                className="-m-1 flex flex-col gap-2 rounded-lg p-1 outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <p className="line-clamp-2 font-medium text-[var(--foreground)]">{a.title}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
                  {a.source ? <span>{a.source}</span> : null}
                  {a.publishedAt ? <span className="tabular-nums">{a.publishedAt}</span> : null}
                  {a.hasLink ? <span>Has link ↗</span> : null}
                  {a.hasImage ? (
                    <Badge variant="subtle" tone="neutral" icon={<ImageIcon />}>
                      Image
                    </Badge>
                  ) : null}
                </div>
              </Link>
            </Card>
          )}
        />
      )}

      <Pager
        info={info}
        hrefForPage={(p) => `/admin/articles?page=${p}`}
        itemLabel="articles"
      />
    </div>
  );
}
