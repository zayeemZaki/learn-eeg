import type { NavItem } from "@/components/shell/nav-config";

/**
 * The single active-route predicate for the whole shell — the logic that used
 * to be copy-pasted into AppNav and AdminNav now lives here. An item is active
 * when the current pathname equals its href, or (unless it opts into exact
 * matching) sits under it as a nested route. Exact-match items — the two
 * dashboards (/dashboard, /admin) — light up only on their own path, so they
 * aren't permanently active while on a deeper sibling route.
 *
 * A plain function (not a hook) so it can be unit-reasoned and called for every
 * item from one usePathname() read in the Sidebar.
 */
export function isActivePath(pathname: string, item: NavItem): boolean {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
