import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandMark } from "./brand-mark";

/**
 * Sticky marketing header: brand mark on the left, auth actions on the right.
 * Translucent with a backdrop blur and a hairline bottom border so content
 * scrolls beneath it. On narrow screens the secondary "Log in" link drops away
 * and only the primary "Get started" action remains.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_75%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <BrandMark />

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] outline-none transition hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] sm:inline-flex"
          >
            Log in
          </Link>
          <Link href="/register">
            <Button>Get started</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
