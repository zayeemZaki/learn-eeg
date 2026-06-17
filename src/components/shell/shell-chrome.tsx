"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import type { NavSection } from "@/components/shell/nav-config";
import {
  SIDEBAR_COOKIE,
  SIDEBAR_COOKIE_MAX_AGE,
  nextSidebarState,
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

const ctrlBtn =
  "inline-flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] outline-none transition hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

/**
 * The interactive shell chrome — the single client island for the shell; the
 * surrounding (app)/(admin) layouts stay server components and pass the nav
 * sections and the sign-out form down. There is NO topbar: content starts at the
 * top of the well. Two floating controls sit in the top gutters instead —
 * a hamburger + brand top-LEFT, and the account avatar top-RIGHT — neither in a
 * full-width bar.
 *
 * The sidebar is the only navigation. Desktop has a three-state sidebar —
 * EXPANDED (w-64, glyphs + labels), ICON RAIL (icons only, focusable tooltips),
 * or HIDDEN. The single top-left hamburger CYCLES those three (expanded → rail →
 * hidden → expanded); the hamburger + brand stay visible in every state. The
 * chosen state persists in a cookie, so the server renders the right width on
 * first paint and the choice survives reload (no localStorage, no flash).
 *
 * Mobile: the sidebar is a slide-over drawer opened by the same top-left
 * hamburger; it closes on navigation and on Escape, traps focus while open, and
 * its controls are keyboard-operable. All transitions are suppressed under
 * prefers-reduced-motion (motion-safe).
 */
export function ShellChrome({ sections, user, signOut, initialSidebar, children }: ShellChromeProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebar, setSidebar] = useState<SidebarState>(initialSidebar);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Persist the desktop state to a cookie so a reload restores it (server reads
  // it in AppShell). A plain document.cookie write — no storage API, no fetch.
  const persistSidebar = useCallback((next: SidebarState) => {
    setSidebar(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`;
  }, []);

  // Desktop: the hamburger cycles expanded → rail → hidden → expanded.
  // Mobile (< lg): the same hamburger opens the slide-over drawer instead.
  const onHamburger = useCallback(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      persistSidebar(nextSidebarState(sidebar));
    } else {
      setDrawerOpen(true);
    }
  }, [sidebar, persistSidebar]);

  const collapsed = sidebar === "rail";

  // Close the drawer whenever the route changes (close-on-navigation).
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // While the drawer is open: lock body scroll, close on Escape, trap focus
  // inside the panel, and move focus into it. On close, return focus to the
  // hamburger. All wired only when open so there's no idle global listener.
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
      // Restore focus to the hamburger (falls back to the stored element).
      (hamburgerRef.current ?? previouslyFocused)?.focus();
    };
  }, [drawerOpen]);

  const railWidth = collapsed ? "w-[4.5rem]" : "w-64";
  const contentPad = sidebar === "hidden" ? "" : collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64";

  return (
    <div className="app-surface min-h-screen">
      {/* Desktop sidebar: fixed, full height, below the floating top-left
          cluster. Width follows the state; `hidden` removes it from the layout
          (the hamburger cycles it back). The nav scrolls; the brand is NOT here
          (it lives in the always-visible top-left cluster). */}
      {sidebar !== "hidden" ? (
        <aside
          className={`fixed inset-y-0 left-0 z-30 hidden border-r border-[var(--border)] bg-[var(--surface)] pt-16 lg:block ${railWidth}`}
        >
          <div className={`flex h-full flex-col ${collapsed ? "p-3" : "p-4"}`}>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav sections={sections} collapsed={collapsed} />
            </div>
          </div>
        </aside>
      ) : null}

      {/* Mobile drawer: slide-over + scrim. Mounted only when open. Carries its
          own brand + close button (it has no shared top cluster). */}
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
            <div className="flex h-full flex-col gap-6 p-4">
              <div className="flex items-center justify-between">
                <BrandGlyph />
                <button
                  type="button"
                  onClick={closeDrawer}
                  className={`${ctrlBtn} h-9 w-9`}
                  aria-label="Close menu"
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SidebarNav sections={sections} collapsed={false} onNavigate={closeDrawer} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Floating top-LEFT cluster: hamburger immediately left of the brand,
          always visible in every sidebar state and on every breakpoint. The
          hamburger cycles the desktop sidebar (expanded→rail→hidden) and opens
          the drawer on mobile; the brand links home. Not part of any bar. */}
      <div className="fixed left-3 top-3 z-40 flex items-center gap-2 sm:left-4 sm:top-4">
        <button
          ref={hamburgerRef}
          type="button"
          onClick={onHamburger}
          className={`${ctrlBtn} h-9 w-9 bg-[var(--surface)]`}
          aria-label="Toggle navigation"
          aria-expanded={drawerOpen}
        >
          <MenuIcon />
        </button>
        <BrandGlyph />
      </div>

      {/* Floating top-RIGHT control: the account avatar menu. A small fixed
          element over the content (not a full-width bar). */}
      <div className="fixed right-3 top-3 z-40 sm:right-4 sm:top-4">
        <AccountMenu name={user.name} email={user.email} signOut={signOut} />
      </div>

      {/* Content column, offset by the fixed sidebar width on desktop. Top
          padding clears the floating top clusters so no page content sits under
          the hamburger/brand or the avatar at any breakpoint. */}
      <div className={`flex min-h-screen flex-col ${contentPad}`}>
        <main className="flex-1 px-4 pb-8 pt-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
