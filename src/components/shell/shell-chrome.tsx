"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import type { NavSection } from "@/components/shell/nav-config";
import { BrandGlyph } from "@/components/shell/brand-glyph";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { Badge } from "@/components/ui/badge";

interface UserBlock {
  name: string;
  /** Human role label, e.g. "Admin" / "Resident". */
  roleLabel: string;
  isAdmin: boolean;
}

interface ShellChromeProps {
  sections: NavSection[];
  user: UserBlock;
  /**
   * Ordered route→title pairs for the topbar heading. The first entry whose
   * `prefix` the current path starts with wins, so deeper routes fall back to
   * their section title; `fallback` covers anything unmatched. Resolved here
   * (client-side, from usePathname) rather than per-page so the topbar title
   * lives in one place.
   */
  titles: { prefix: string; title: string }[];
  fallbackTitle: string;
  /** Admin shell shows a "Back to app" affordance in the topbar. */
  showBackToApp?: boolean;
  /** The server-action sign-out <form>, passed through unchanged. */
  signOut: ReactNode;
  /** The routed page content. */
  children: ReactNode;
}

// Small glyphs local to the chrome (hamburger / collapse arrows). Presentational.
function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d={collapsed ? "M8 5l5 5-5 5" : "M12 5l-5 5 5 5"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const railBtn =
  "inline-flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] outline-none transition hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

/**
 * The interactive shell chrome: a fixed left sidebar + thin topbar + scrollable
 * content area, full height. This is the single client island for the shell —
 * the surrounding (app)/(admin) layouts stay server components and pass the role
 * (from the session they already hold), the nav sections, and the sign-out form
 * down. Only the drawer/collapse/active-link behaviour is client-side.
 *
 * Desktop: a persistent sidebar that collapses to an icon rail (state kept in
 * component memory for the session). Mobile: the sidebar becomes a slide-over
 * drawer opened by the topbar hamburger — it closes on navigation and on Escape,
 * traps focus while open, and its controls are keyboard-operable. All open/close
 * transitions are suppressed under prefers-reduced-motion (motion-safe).
 */
export function ShellChrome({
  sections,
  user,
  titles,
  fallbackTitle,
  showBackToApp = false,
  signOut,
  children,
}: ShellChromeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Longest-prefix-wins title match: try the most specific entries first.
  const title =
    [...titles]
      .sort((a, b) => b.prefix.length - a.prefix.length)
      .find((t) => pathname === t.prefix || pathname.startsWith(`${t.prefix}/`))?.title ??
    fallbackTitle;
  const drawerRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Close the drawer whenever the route changes (close-on-navigation).
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // While the drawer is open: lock body scroll, close on Escape, trap focus
  // inside the panel, and move focus into it. On close, return focus to the
  // opener. All wired only when open so there's no idle global listener.
  useEffect(() => {
    if (!drawerOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const panel = drawerRef.current;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    // Focus the first control in the drawer once it's mounted.
    focusables()[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setDrawerOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      // Wrap focus at the ends so Tab never escapes the open drawer.
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
      // Restore focus to the opener (falls back to the stored element).
      (openerRef.current ?? previouslyFocused)?.focus();
    };
  }, [drawerOpen]);

  // The sidebar inner content — brand, nav, and the pinned user block — shared
  // by the desktop rail and the mobile drawer so they never drift.
  function SidebarBody({ inDrawer }: { inDrawer: boolean }) {
    const isCollapsed = collapsed && !inDrawer;
    return (
      <div className="flex h-full flex-col gap-6 p-4">
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
          <BrandGlyph collapsed={isCollapsed} />
          {inDrawer ? (
            <button
              type="button"
              onClick={closeDrawer}
              className={`${railBtn} h-9 w-9`}
              aria-label="Close menu"
            >
              <CloseIcon />
            </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarNav
            sections={sections}
            collapsed={isCollapsed}
            onNavigate={inDrawer ? closeDrawer : undefined}
          />
        </div>

        {/* User block pinned to the bottom: name, role badge, sign out. */}
        <div className="border-t border-[var(--border)] pt-4">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <span
                className="grid h-9 w-9 place-items-center rounded-full bg-[var(--background)] text-sm font-semibold text-[var(--muted)]"
                title={`${user.name} · ${user.roleLabel}`}
                aria-label={`${user.name}, ${user.roleLabel}`}
              >
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              {signOut}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--foreground)]">
                  {user.name}
                </p>
                <div className="mt-1">
                  {user.isAdmin ? (
                    <Badge tone="accent">{user.roleLabel}</Badge>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">{user.roleLabel}</span>
                  )}
                </div>
              </div>
              {signOut}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar: fixed, full height, collapsible to an icon rail. */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-[var(--border)] bg-[var(--surface)] lg:block ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <SidebarBody inDrawer={false} />
      </aside>

      {/* Mobile drawer: slide-over + scrim. Mounted only when open. */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--foreground)_45%,transparent)] motion-safe:transition-opacity"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            className="absolute inset-y-0 left-0 w-72 max-w-[85%] border-r border-[var(--border)] bg-[var(--surface)] shadow-xl motion-safe:animate-[drawerIn_0.2s_ease-out]"
          >
            <SidebarBody inDrawer />
          </div>
        </div>
      ) : null}

      {/* Content column, offset by the fixed sidebar width on desktop. */}
      <div className={`flex min-h-screen flex-col ${collapsed ? "lg:pl-16" : "lg:pl-64"}`}>
        {/* Thin topbar: hamburger (mobile) + collapse (desktop), page title,
            and the admin "Back to app" affordance. */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_85%,transparent)] px-4 backdrop-blur-md sm:px-6">
          <button
            ref={openerRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={`${railBtn} h-9 w-9 lg:hidden`}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
          >
            <MenuIcon />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={`${railBtn} hidden h-9 w-9 lg:inline-flex`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>

          <h2 className="min-w-0 flex-1 truncate font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
            {title}
          </h2>

          {showBackToApp ? (
            <Link
              href="/dashboard"
              className="rounded-md px-2 py-1 text-sm text-[var(--muted)] outline-none transition hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              Back to app
            </Link>
          ) : null}
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
