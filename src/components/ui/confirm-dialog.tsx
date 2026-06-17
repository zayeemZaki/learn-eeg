"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  /** Controls visibility — the trigger lives in the caller. */
  open: boolean;
  /** Dialog heading (e.g. "Delete question?"). */
  title: string;
  /** Supporting body copy — what the action does and that it can't be undone. */
  description: ReactNode;
  /** Confirm button label (e.g. "Delete"). Destructive styling is applied. */
  confirmLabel: string;
  /** Cancel button label. Defaults to "Cancel". */
  cancelLabel?: string;
  /** True while the confirm action is in flight — disables both buttons. */
  pending?: boolean;
  /** Run the destructive action. */
  onConfirm: () => void;
  /** Dismiss without acting (scrim click, Escape, Cancel). */
  onCancel: () => void;
}

/**
 * One reusable confirm modal — shared by the admin edit pages' delete affordance
 * (and anywhere else a destructive action needs a deliberate second step). NOT
 * an inline-in-list confirm: it's a centred dialog over a scrim.
 *
 * A11y: `role="dialog"` + `aria-modal`, labelled/described by its own title and
 * body. On open it moves focus to the Cancel button (the safe default) and traps
 * Tab inside the panel; Escape and the scrim cancel; on close focus returns to
 * whatever was focused before (the trigger). The entrance is gated behind
 * motion-safe so prefers-reduced-motion users get an instant open.
 *
 * Pure presentation — it owns no action logic; the caller passes onConfirm.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  // While open: lock body scroll, focus the (safe) Cancel button, trap Tab, and
  // close on Escape. On close, return focus to the previously focused element
  // (the trigger). Wired only when open so there's no idle global listener.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    cancelRef.current?.focus();

    function focusables() {
      return Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      // Wrap focus at the ends so Tab never escapes the open dialog.
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      {/* Scrim — clicking it cancels (same as Escape). */}
      <div
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--foreground)_45%,transparent)] motion-safe:transition-opacity"
        onClick={pending ? undefined : onCancel}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl shadow-[color-mix(in_srgb,var(--foreground)_12%,transparent)] motion-safe:animate-[menuIn_0.12s_ease-out]"
      >
        <h2 id={titleId} className="text-base font-semibold text-[var(--foreground)]">
          {title}
        </h2>
        <p id={descId} className="mt-2 text-sm text-[var(--muted)]">
          {description}
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button
            ref={cancelRef}
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="border-transparent bg-red-600 from-red-600 to-red-700 text-white shadow-sm shadow-[color-mix(in_srgb,#dc2626_35%,transparent)] hover:bg-red-700 hover:shadow-md focus-visible:ring-red-600"
          >
            {pending ? "Deleting…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
