import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { ArticleForm } from "@/components/admin/article-form";
import { DeleteArticleButton } from "@/components/admin/delete-article-button";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Edit article" };

/**
 * Edit page. Fetches the article's scalar fields and renders the shared
 * ArticleForm in edit mode (it pre-fills, shows the current figure, and calls
 * updateArticle). In Next 15+/16 params is async and must be awaited.
 */
export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const article = await db.article.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      summary: true,
      url: true,
      source: true,
      publishedAt: true,
      imageUrl: true,
    },
  });
  if (!article) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Edit article"
        back={{ href: "/admin/articles", label: "Back to literature" }}
      />
      <ArticleForm article={article} />

      {/* Danger zone — the delete control lives on the edit page (not the list);
          the trash button opens a confirm modal and, on success, returns to the
          list. The deleteArticle action itself is unchanged. */}
      <section
        aria-label="Danger zone"
        className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_25%,var(--border))] bg-danger-soft p-4"
      >
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Danger zone</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Deleting this article removes it from the literature list permanently. This
          can&apos;t be undone.
        </p>
        <div className="mt-3">
          <DeleteArticleButton id={article.id} />
        </div>
      </section>
    </div>
  );
}
