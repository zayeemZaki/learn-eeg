"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The admin nav strip. Kept separate from AppNav (which lists the public app
 * sections) so admin links never leak into the signed-in app chrome and vice
 * versa — same active-route treatment, different destinations.
 *
 * Overview, Questions, and Users are live; Atlas routes to a "coming next phase"
 * placeholder. Literature has no admin (it stays the live public PubMed feed),
 * so it's intentionally absent here — no dead link. Order here is the order
 * shown.
 */
const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/atlas", label: "Atlas" },
  { href: "/admin/users", label: "Users" },
];

const linkBase =
  "rounded-md px-1 py-1 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

/**
 * Admin navigation. Mirrors AppNav's behaviour: the current section gets accent
 * text and an accent underline; others are --muted and brighten on hover. The
 * Overview tab (/admin) matches only its exact path so it isn't permanently
 * active while on a deeper /admin/* route; every other item also matches nested
 * routes.
 *
 * This is the only "use client" island in the admin chrome — it needs
 * usePathname — so the surrounding layout stays a server component.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      {NAV.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
