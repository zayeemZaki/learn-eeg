"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  /** Controls visibility — the trigger lives in the caller. */
  open: boolean;
  /** Dismiss (scrim click, Escape). */
  onClose: () => void;
  /** Accessible name for the dialog (aria-label). */
  label: string;
  /** Panel contents. */
  children: ReactNode;
  /** Extra classes for the panel (sizing/layout). Defaults to a small card. */
  className?: string;
  /** Optional extra key handling (e.g. ←/→ for a lightbox). Runs before the
   *  built-in Escape/Tab handling; call preventDefault to consume a key. */
  onKeyDown?: (e: KeyboardEvent) => void;
}

/**
 * The shared focus-trapped modal primitive — extracted from ConfirmDialog's
 * focus-management so a lightbox (and any future dialog) can reuse the exact same
 * a11y behaviour without inheriting ConfirmDialog's fixed confirm/cancel layout.
 *
 * Provides: role="dialog" + aria-modal, an aria-label, body-scroll lock while
 * open, focus moved into the panel on open, Tab trapped (wrapping at both ends),
 * Escape and scrim-click to close, and focus restored to the previously focused
 * element (the trigger) on close. Entrance is gated behind motion-safe so
 * prefers-reduced-motion users get an instant open. Callers own all content and
 * any extra keybindings via onKeyDown.
 */
export function Modal({
  open,
  onClose,
  label,
  children,
  className = "w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl shadow-[color-mix(in_srgb,var(--foreground)_12%,transparent)]",
  onKeyDown,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    // Move focus into the panel (the panel itself is focusable via tabIndex).
    panelRef.current?.focus();

    function focusables() {
      return Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Caller's extra keybindings first; they may consume the event.
      onKeyDown?.(e);
      if (e.defaultPrevented) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        // Nothing else focusable — keep focus on the panel.
        e.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose, onKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--foreground)_45%,transparent)] motion-safe:transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`relative outline-none motion-safe:animate-[menuIn_0.12s_ease-out] ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
