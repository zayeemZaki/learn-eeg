import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/site/brand-mark";
import { AdminNav } from "@/components/site/admin-nav";

/**
 * Admin shell + defence-in-depth guard for every /admin route.
 *
 * Middleware already redirects non-admins at the edge; this server-side
 * re-check (the same pattern the (app) layout uses for plain auth) ensures a
 * direct render can never bypass the gate. Signed-out users are sent to /login,
 * signed-in non-admins to /dashboard.
 *
 * The chrome deliberately matches the rest of the site — sticky, translucent
 * --surface with a backdrop blur and a hairline bottom border — so admin reads
 * as one product with the app, but is clearly signposted by an "Admin" badge
 * beside the brand mark and a "Back to app" link. Stays a server component (it
 * must await the session); only the active-route nav strip is a client island.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_75%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-2">
              <BrandMark size="sm" />
              {/* Signposts the admin area; an accent-tinted pill, not a loud
                  banner, so it sits quietly within the shared chrome. */}
              <span className="rounded-full border border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-2 py-0.5 text-xs font-semibold tracking-wide text-[var(--accent)]">
                Admin
              </span>
            </div>
            <AdminNav />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/dashboard"
              className="rounded-md px-1 py-1 text-sm text-[var(--muted)] outline-none transition hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              Back to app
            </Link>
            <form action={handleSignOut}>
              <Button variant="ghost" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
