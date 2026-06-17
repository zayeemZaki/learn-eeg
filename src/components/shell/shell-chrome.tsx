"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import type { NavSection } from "@/components/shell/nav-config";
import {
  SIDEBAR_COOKIE,
  SIDEBAR_COOKIE_MAX_AGE,
  type SidebarState,
} from "@/components/shell/sidebar-state";
import { BrandGlyph } from "@/components/shell/brand-glyph";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { AccountMenu } from "@/components/shell/account-menu";

interface UserBlock {
  name: string;
  email: string;
}

interface ShellChromeProps {
  sections: NavSection[];
  user: UserBlock;
  /** The server-action sign-out <form>, rendered inside the account menu. */
  signOut: ReactNode;
  /** Desktop sidebar state read from the cookie on the server (no flash). */
  initialSidebar: SidebarState;
  /** The routed page content. */
  children: ReactNode;
}

// Small glyphs local to the chrome. Presentational.
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
// A double-chevron that points left when expanded (collapse) and right when on
// the rail (expand) — the direction is the affordance, not colour.
function CollapseIcon({ pointing }: { pointing: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 ${pointing === "right" ? "rotate-180" : ""}`}
      fill="none"
      aria-hidden="true"
    >
      <path d="M11 5l-4 5 4 5M15 5l-4 5 4 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const railBtn =
  "inline-flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] outline-none transition hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

/**
 * The interactive shell chrome: a fixed left sidebar + thin topbar + scrollable
 * content area, full height. This is the single client island for the shell —
 * the surrounding (app)/(admin) layouts stay server components and pass the
 * nav sections and the sign-out form down. The sidebar is the only navigation;
 * the topbar carries no page nav (just the mobile drawer toggle, the desktop
 * sidebar controls, and the top-right account menu).
 *
 * Desktop: a three-state sidebar — EXPANDED (w-64, glyphs + labels), ICON RAIL
 * (icons only with tooltips), or HIDDEN. A chevron at the sidebar foot cycles
 * expanded↔rail; a small "hide" control collapses it away, and a topbar opener
 * brings it back. The chosen state is persisted in a cookie, so the server
 * renders the right width on first paint and the choice survives reload (no
 * localStorage). Mobile: the sidebar is a slide-over drawer opened by the topbar
 * hamburger — it closes on navigation and on Escape, traps focus while open, and
 * its controls are keyboard-operable. All transitions are suppressed under
 * prefers-reduced-motion (motion-safe).
 */
export function ShellChrome({ sections, user, signOut, initialSidebar, children }: ShellChromeProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebar, setSidebar] = useState<SidebarState>(initialSidebar);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Persist the desktop state to a cookie so a reload restores it (server reads
  // it in AppShell). A plain document.cookie write — no storage API, no fetch.
  const persistSidebar = useCallback((next: SidebarState) => {
    setSidebar(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`;
  }, []);

  // The chevron cycles expanded ↔ rail (the two visible widths); the separate
  // hide/show controls move to/from hidden.
  const toggleRail = useCallback(
    () => persistSidebar(sidebar === "expanded" ? "rail" : "expanded"),
    [sidebar, persistSidebar],
  );

  const collapsed = sidebar === "rail";

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

  // The sidebar inner content — brand + nav + (desktop only) the foot controls —
  // shared by the desktop rail and the mobile drawer so they never drift. The
  // brand sits at the top and is the only brand instance in the shell; the
  // account identity lives in the top-right menu. The drawer adds a close
  // affordance beside the brand (it has no topbar) and never shows the desktop
  // collapse/hide controls.
  function SidebarBody({ inDrawer }: { inDrawer: boolean }) {
    // The drawer always renders fully expanded; only the desktop rail collapses.
    const railed = !inDrawer && collapsed;
    return (
      <div className={`flex h-full flex-col gap-6 ${railed ? "p-3" : "p-4"}`}>
        <div className={`flex items-center ${railed ? "justify-center" : "justify-between"}`}>
          <BrandGlyph collapsed={railed} />
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
            collapsed={railed}
            onNavigate={inDrawer ? closeDrawer : undefined}
          />
        </div>

        {/* Desktop foot controls: cycle expanded↔rail, plus a hide affordance.
            Absent from the mobile drawer (which has its own close button). */}
        {!inDrawer ? (
          <div
            className={`flex items-center gap-1 border-t border-[var(--border)] pt-3 ${
              railed ? "flex-col" : "justify-between"
            }`}
          >
            <button
              type="button"
              onClick={toggleRail}
              className={`${railBtn} h-9 ${railed ? "w-9" : "flex-1 gap-2 px-3 text-sm font-medium"}`}
              aria-label={railed ? "Expand sidebar" : "Collapse to icons"}
              title={railed ? "Expand sidebar" : "Collapse to icons"}
            >
              <CollapseIcon pointing={railed ? "right" : "left"} />
              {!railed ? <span>Collapse</span> : null}
            </button>
            <button
              type="button"
              onClick={() => persistSidebar("hidden")}
              className={`${railBtn} h-9 w-9`}
              aria-label="Hide sidebar"
              title="Hide sidebar"
            >
              <CloseIcon />
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  const railWidth = collapsed ? "w-[4.5rem]" : "w-64";
  const contentPad = sidebar === "hidden" ? "" : collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64";

  return (
    <div className="app-surface min-h-screen">
      {/* Desktop sidebar: fixed, full height. Width follows the state; hidden
          removes it from the layout (the topbar opener brings it back). */}
      {sidebar !== "hidden" ? (
        <aside
          className={`fixed inset-y-0 left-0 z-40 hidden border-r border-[var(--border)] bg-[var(--surface)] lg:block ${railWidth}`}
        >
          <SidebarBody inDrawer={false} />
        </aside>
      ) : null}

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
      <div className={`flex min-h-screen flex-col ${contentPad}`}>
        {/* Thin topbar: no page nav (the sidebar is the only nav). On mobile the
            hamburger opens the drawer; on desktop, when the sidebar is hidden, a
            matching opener brings it back. On every breakpoint the account menu
            sits top-right. The flex spacer keeps the avatar right. */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_85%,transparent)] px-4 backdrop-blur-md sm:px-6">
          {/* Mobile only: opens the slide-over drawer. */}
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

          {/* Desktop only, and only when the sidebar is hidden: bring it back. */}
          {sidebar === "hidden" ? (
            <button
              type="button"
              onClick={() => persistSidebar("expanded")}
              className={`${railBtn} hidden h-9 w-9 lg:inline-flex`}
              aria-label="Show sidebar"
              title="Show sidebar"
            >
              <MenuIcon />
            </button>
          ) : null}

          <div className="flex-1" aria-hidden="true" />

          <AccountMenu
            name={user.name}
            email={user.email}
            signOut={signOut}
          />
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
