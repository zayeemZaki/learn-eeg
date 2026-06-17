"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { TrashIcon } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteQuestion } from "@/app/actions/admin-questions";

/**
 * Delete affordance for the question EDIT page (moved here from the list row):
 * a destructive trash-icon button that opens a shared confirm modal so a
 * question is never destroyed on a single click. Confirm calls the role-gated
 * deleteQuestion action (which cascades choices + attempts) unchanged; the
 * action revalidates /admin/questions, and on success we navigate back to that
 * list (the list page is where the deletion is reflected). Errors surface inline
 * below the button.
 */
export function DeleteQuestionButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteQuestion(id);
      if (!result.ok) {
        setError(result.error);
        setOpen(false);
        return;
      }
      // Deleted: the action already revalidated the list — return to it.
      router.push("/admin/questions");
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,#dc2626_30%,var(--border))] px-3 py-2 text-sm font-medium text-red-600 outline-none transition hover:bg-[color-mix(in_srgb,#dc2626_8%,transparent)] focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
        aria-label="Delete question"
      >
        <TrashIcon />
        Delete question
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}

      <ConfirmDialog
        open={open}
        title="Delete question?"
        description="This permanently removes the question along with its choices and any attempt history. This can't be undone."
        confirmLabel="Delete question"
        pending={isPending}
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
