"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteAtlasEntry } from "@/app/actions/admin-atlas";

/**
 * Two-step delete for an atlas-entry row: the first click reveals
 * Confirm/Cancel so an entry is never destroyed on a single click. Confirm
 * calls the role-gated deleteAtlasEntry action and the revalidated list
 * re-renders without the row. Errors surface inline. (Same pattern as
 * DeleteQuestionButton; atlas deletes are simpler — no inbound FKs — so the
 * action can't reject for a relational reason, but we surface any error anyway.)
 */
export function DeleteAtlasButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAtlasEntry(id);
      if (!result.ok) {
        setError(result.error);
        setConfirming(false);
      }
      // On success the action revalidates /admin/atlas and the row vanishes.
    });
  }

  // Stop clicks bubbling so a Delete inside a row-link cell never also triggers
  // the row's edit navigation (the control already sits above the row overlay).
  if (!confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          type="button"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setConfirming(true);
          }}
        >
          Delete
        </Button>
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--muted)]">Delete?</span>
      <Button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onConfirm();
        }}
        disabled={isPending}
      >
        {isPending ? "Deleting…" : "Confirm"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setConfirming(false);
        }}
        disabled={isPending}
      >
        Cancel
      </Button>
    </div>
  );
}
