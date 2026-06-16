"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The authed nav strip, shared across every (app) route. */
const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/questions", label: "Question Bank" },
  { href: "/atlas", label: "Atlas" },
  { href: "/literature", label: "Literature" },
];

/**
 * Admins additionally get an entry into the admin area. Listed separately (and
 * appended last) so it only renders when the layout passes isAdmin — the role
 * comes from the session the server layout already holds, never a fetch here.
 */
const ADMIN_LINK = { href: "/admin", label: "Admin" };

const linkBase =
  "rounded-md px-1 py-1 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

/**
 * Authed navigation. Lives in one place so the active-route logic isn't copied
 * per link: the current section gets accent text and an accent underline, every
 * other link is --muted and brightens on hover. A nested route (e.g.
 * /atlas/normal) still highlights its parent (/atlas).
 *
 * This is the only "use client" island in the authed chrome — it needs
 * usePathname — so the surrounding layout stays a server component. The admin
 * link is gated on the isAdmin prop the server layout derives from the session;
 * for everyone else it isn't rendered at all (absent from the DOM, not hidden).
 */
export function AppNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...NAV, ADMIN_LINK] : NAV;

  return (
    <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${linkBase} ${
              active
                ? "font-medium text-[var(--accent)] underline decoration-[var(--accent)] decoration-2 underline-offset-8"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
