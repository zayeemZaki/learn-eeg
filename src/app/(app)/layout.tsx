import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/site/brand-mark";
import { AppNav } from "@/components/site/app-nav";

/**
 * Guards every nested route. Middleware already redirects unauthenticated
 * users; re-checking here is defence in depth and gives us the session for nav.
 *
 * The chrome mirrors the marketing SiteHeader — sticky, translucent --surface
 * with a backdrop blur and a hairline bottom border — so the signed-in app and
 * the public site read as one product. Stays a server component (it must await
 * the session); only the active-route nav strip is a client island.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_75%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <BrandMark size="sm" />
            <AppNav isAdmin={session.user.role === "ADMIN"} />
          </div>
          <form action={handleSignOut}>
            <Button variant="ghost" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
