"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { TrashIcon } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteArticle } from "@/app/actions/admin-articles";

/**
 * Delete affordance for the article EDIT page: a destructive trash-icon button
 * that opens a shared confirm modal so an article is never destroyed on a single
 * click. Confirm calls the role-gated deleteArticle action (which also cleans up
 * the figure Blob, best-effort) unchanged; the action revalidates /admin/articles
 * and /literature, and on success we navigate back to the list. Same pattern as
 * DeleteAtlasButton / DeleteQuestionButton.
 */
export function DeleteArticleButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteArticle(id);
      if (!result.ok) {
        setError(result.error);
        setOpen(false);
        return;
      }
      // Deleted: the action already revalidated the list — return to it.
      router.push("/admin/articles");
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--danger)_30%,var(--border))] px-3 py-2 text-sm font-medium text-danger outline-none transition hover:bg-danger-soft focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
        aria-label="Delete article"
      >
        <TrashIcon />
        Delete article
      </button>
      {error ? <span role="alert" className="text-xs text-danger">{error}</span> : null}

      <ConfirmDialog
        open={open}
        title="Delete article?"
        description="This permanently removes the article from the literature list. This can't be undone."
        confirmLabel="Delete article"
        pending={isPending}
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
