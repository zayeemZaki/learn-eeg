"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { TrashIcon } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteUser } from "@/app/actions/admin-users";

export function DeleteUserButton({
  id,
  name,
  disabled = false,
}: {
  id: string;
  name: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteUser(id);
      if (!result.ok) {
        setError(result.error);
        setOpen(false);
        return;
      }
      // Deleted: the action already revalidated the list — return to it.
      router.push("/admin/users");
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--danger)_30%,var(--border))] px-3 py-2 text-sm font-medium text-danger outline-none transition hover:bg-danger-soft focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
        aria-label={`Delete ${name}`}
      >
        <TrashIcon />
        Delete user
      </button>
      {disabled ? (
        <span className="text-xs text-[var(--muted)]">
          You can&apos;t delete your own account.
        </span>
      ) : null}
      {error ? <span role="alert" className="text-xs text-danger">{error}</span> : null}

      <ConfirmDialog
        open={open}
        title="Delete user?"
        description={
          <>
            This permanently deletes <strong>{name}</strong>&apos;s account, along
            with their entire attempt history and all of their sessions. This
            can&apos;t be undone.
          </>
        }
        confirmLabel="Delete user"
        pending={isPending}
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
