"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteQuestion } from "@/app/actions/admin-questions";

/**
 * Two-step delete for a question row: the first click reveals Confirm/Cancel so
 * a question is never destroyed on a single click. Confirm calls the
 * role-gated deleteQuestion action (which cascades choices + attempts) and the
 * revalidated list re-renders without the row. Errors surface inline.
 */
export function DeleteQuestionButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteQuestion(id);
      if (!result.ok) {
        setError(result.error);
        setConfirming(false);
      }
      // On success the action revalidates /admin/questions and the row vanishes.
    });
  }

  if (!confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button type="button" variant="ghost" onClick={() => setConfirming(true)}>
          Delete
        </Button>
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--muted)]">Delete?</span>
      <Button type="button" onClick={onConfirm} disabled={isPending}>
        {isPending ? "Deleting…" : "Confirm"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setConfirming(false)}
        disabled={isPending}
      >
        Cancel
      </Button>
    </div>
  );
}
