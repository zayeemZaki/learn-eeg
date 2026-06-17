/**
 * Sidebar persistence helpers — shared by the SERVER ({@link AppShell}, which
 * reads the cookie to render the right width on first paint) and the CLIENT
 * (ShellChrome, which writes the cookie on toggle). Kept in a plain module (no
 * "use client"): a function exported from a "use client" module is a client
 * reference and can't be *called* on the server, which is exactly the trap this
 * file avoids — the server reads/normalizes here, the client only writes.
 */

/**
 * Desktop sidebar states. `expanded` shows glyphs + labels (the w-64 rail);
 * `rail` is an icon-only strip with hover/focus tooltips; `hidden` removes the
 * rail entirely and surfaces a small opener in the topbar. The chosen state is
 * persisted to a cookie (read server-side by AppShell) so it survives reload.
 */
export type SidebarState = "expanded" | "rail" | "hidden";

/** Cookie name + a one-year max-age; shared by the server read and client write. */
export const SIDEBAR_COOKIE = "sidebar";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Coerce any cookie value to a known state, defaulting to expanded. */
export function normalizeSidebarState(value: string | undefined): SidebarState {
  return value === "rail" || value === "hidden" ? value : "expanded";
}
