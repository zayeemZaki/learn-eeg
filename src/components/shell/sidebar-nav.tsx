"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavSection } from "@/components/shell/nav-config";
import { isActivePath } from "@/components/shell/use-active-path";

interface SidebarNavProps {
  sections: NavSection[];
  /** Icon-rail mode: labels hidden, icons centred, label moved to title attr. */
  collapsed: boolean;
  /** Called on link click so the mobile drawer closes on navigation. */
  onNavigate?: () => void;
}

/**
 * The navigation list inside the sidebar — primary section plus, for admins, a
 * visually distinct admin section under its own heading. The active item is
 * decided once via the shared isActivePath predicate (no per-link copy of the
 * logic), and is signalled by an accent-tinted fill, accent text, and a left
 * accent bar — not colour alone. Every item is a real <Link> with a visible
 * keyboard focus ring.
 *
 * When `collapsed`, labels and section headings are hidden and each link
 * centres its icon with the label surfaced via `title`/`aria-label`, so the rail
 * stays usable and keyboard-navigable at icon width.
 */
export function SidebarNav({ sections, collapsed, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6">
      {sections.map((section, si) => (
        <div key={si} className="flex flex-col gap-1">
          {section.title && !collapsed ? (
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {section.title}
            </p>
          ) : null}
          {section.title && !collapsed ? null : si > 0 && collapsed ? (
            // Collapsed: a hairline divider stands in for the hidden heading so
            // the admin group stays visually distinct on the rail.
            <div className="mx-2 mb-1 border-t border-[var(--border)]" aria-hidden="true" />
          ) : null}

          {section.items.map((item) => {
            const active = isActivePath(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] ${
                  collapsed ? "justify-center" : ""
                } ${
                  active
                    ? "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] font-medium text-[var(--accent)]"
                    : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                }`}
              >
                {/* Left accent bar: a non-colour-only active cue (position + the
                    fill + accent text all signal the current section). */}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent)]"
                  />
                ) : null}
                <span className="shrink-0">{item.icon}</span>
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
