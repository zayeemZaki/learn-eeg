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
 * rail entirely (only the top-left hamburger + brand remain). The chosen state is
 * persisted to a cookie (read server-side by AppShell) so it survives reload.
 * The top-left hamburger cycles through them in this order.
 */
export type SidebarState = "expanded" | "rail" | "hidden";

/** Cookie name + a one-year max-age; shared by the server read and client write. */
export const SIDEBAR_COOKIE = "sidebar";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Coerce any cookie value to a known state, defaulting to expanded. */
export function normalizeSidebarState(value: string | undefined): SidebarState {
  return value === "rail" || value === "hidden" ? value : "expanded";
}

/**
 * The hamburger's tri-state cycle: FULL → RAIL → HIDDEN → FULL. Kept here (not
 * inlined in the client island) so the order is defined once alongside the type.
 */
export function nextSidebarState(current: SidebarState): SidebarState {
  return current === "expanded" ? "rail" : current === "rail" ? "hidden" : "expanded";
}
