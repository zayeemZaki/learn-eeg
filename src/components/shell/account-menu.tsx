"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

interface AccountMenuProps {
  name: string;
  email: string;
  /** The server-action sign-out <form>, rendered as the final menu item. */
  signOut: ReactNode;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * The top-right account control: an initials/avatar trigger that opens a
 * dropdown with the signed-in user's name and email, a link to Settings, and the
 * sign-out form. No role pill — admin status is already signalled by the
 * sidebar's admin section. This is the single source of the account identity in
 * the shell; the sidebar no longer renders it.
 *
 * Menu semantics: the trigger is a `button` with `aria-haspopup="menu"` /
 * `aria-expanded`; the panel is `role="menu"` and its actionable rows are
 * `role="menuitem"`. It opens on click and closes on outside-click, Escape, or
 * selecting an item, always returning focus to the trigger. Arrow keys move
 * between items (roving focus) and Tab works too. The entrance transition is
 * gated behind motion-safe so prefers-reduced-motion users get an instant open.
 */
export function AccountMenu({ name, email, signOut }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);

  // Move focus among the menu's focusable rows (links + the sign-out button).
  const focusItem = useCallback((dir: 1 | -1 | "first" | "last") => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (items.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    const idx = items.indexOf(active!);
    let next: number;
    if (dir === "first") next = 0;
    else if (dir === "last") next = items.length - 1;
    else if (idx === -1) next = dir === 1 ? 0 : items.length - 1;
    else next = (idx + dir + items.length) % items.length;
    items[next]?.focus();
  }, []);

  // While open: close on outside-click, handle Escape / arrow keys, and move
  // focus into the first item. On close, focus returns to the trigger. Wired
  // only when open so there's no idle global listener.
  useEffect(() => {
    if (!open) return;

    focusItem("first");

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
          break;
        case "ArrowDown":
          e.preventDefault();
          focusItem(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          focusItem(-1);
          break;
        case "Home":
          e.preventDefault();
          focusItem("first");
          break;
        case "End":
          e.preventDefault();
          focusItem("last");
          break;
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, focusItem]);

  const menuItemClass =
    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[var(--foreground)] outline-none transition hover:bg-[var(--background)] focus-visible:bg-[var(--background)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          // Let ArrowDown open the menu and land on the first item.
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--muted)] outline-none transition hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] aria-expanded:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${name}`}
      >
        {initials(name)}
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg shadow-[color-mix(in_srgb,var(--foreground)_12%,transparent)] motion-safe:animate-[menuIn_0.12s_ease-out]"
        >
          {/* Identity header — not a menuitem, just context. Name + email only;
              admin status is signalled by the sidebar's admin section. */}
          <div className="border-b border-[var(--border)] px-2 pb-3 pt-1.5">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{name}</p>
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]" title={email}>
              {email}
            </p>
          </div>

          <div className="pt-1.5">
            <Link
              href="/settings"
              role="menuitem"
              tabIndex={-1}
              onClick={close}
              className={menuItemClass}
            >
              <SettingsIcon />
              Settings
            </Link>

            {/* Reuses the server-action sign-out form passed down from the
                layout — never reimplemented here. The layout marks its <button>
                role="menuitem" / tabIndex=-1, so it joins the roving-focus set
                and is styled to match the rows via .account-menu-signout. */}
            <div className="account-menu-signout">{signOut}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-[var(--muted)]" fill="none" aria-hidden="true">
      <path
        d="M10 13a3 3 0 100-6 3 3 0 000 6z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M10 2.5l.9 1.8 2-.3.5 2 1.8.9-.9 1.8.9 1.8-1.8.9-.5 2-2-.3-.9 1.8-.9-1.8-2 .3-.5-2-1.8-.9.9-1.8-.9-1.8 1.8-.9.5-2 2 .3.9-1.8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
