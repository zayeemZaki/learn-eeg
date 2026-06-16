import type { ReactNode } from "react";

/**
 * Single source of truth for the shell's navigation. The primary section is the
 * authed app; the admin section is rendered by the Sidebar only when
 * role === "ADMIN" (the role comes from the session the server layout already
 * holds — never a fetch). Order here is the order shown.
 *
 * `match: "exact"` highlights only on the literal path (the dashboards, whose
 * children live under sibling routes); the default highlights the item for its
 * path and any nested route beneath it (e.g. /questions/[id] keeps Question Bank
 * active, /admin/questions/[id]/edit keeps the admin Questions item active).
 */
export interface NavItem {
  href: string;
  label: string;
  /** Inline glyph; rendered in the sidebar rail and beside the label. */
  icon: ReactNode;
  /** "exact" matches only the literal href; otherwise nested routes match too. */
  match?: "exact";
}

export interface NavSection {
  /** Optional heading shown above the group (e.g. "Admin"). */
  title?: string;
  items: NavItem[];
}
