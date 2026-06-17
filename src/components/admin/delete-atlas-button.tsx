"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { TrashIcon } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteAtlasEntry } from "@/app/actions/admin-atlas";

/**
 * Delete affordance for the atlas-entry EDIT page (moved here from the list
 * row): a destructive trash-icon button that opens a shared confirm modal so an
 * entry is never destroyed on a single click. Confirm calls the role-gated
 * deleteAtlasEntry action unchanged; the action revalidates /admin/atlas, and on
 * success we navigate back to that list. Same pattern as DeleteQuestionButton;
 * atlas deletes are simpler (no inbound FKs) but we still surface any error.
 */
export function DeleteAtlasButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAtlasEntry(id);
      if (!result.ok) {
        setError(result.error);
        setOpen(false);
        return;
      }
      // Deleted: the action already revalidated the list — return to it.
      router.push("/admin/atlas");
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--danger)_30%,var(--border))] px-3 py-2 text-sm font-medium text-danger outline-none transition hover:bg-danger-soft focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
        aria-label="Delete atlas entry"
      >
        <TrashIcon />
        Delete entry
      </button>
      {error ? <span role="alert" className="text-xs text-danger">{error}</span> : null}

      <ConfirmDialog
        open={open}
        title="Delete atlas entry?"
        description="This permanently removes this atlas entry and its image reference. This can't be undone."
        confirmLabel="Delete entry"
        pending={isPending}
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
