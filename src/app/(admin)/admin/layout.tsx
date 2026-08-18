import { redirect } from "next/navigation";

import { signOut } from "@/auth";
import { checkPageAccess } from "@/lib/auth-guards";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/shell/app-shell";

/**
 * Admin shell + defence-in-depth guard for every /admin route.
 *
 * Middleware already redirects non-admins at the edge; this server-side
 * re-check (the same pattern the (app) layout uses) ensures a direct render can
 * never bypass the gate. Signed-out users are sent to /login, signed-in
 * non-admins to /dashboard.
 *
 * STALE-JWT READ GATE: the proxy and the token both carry `role` from login,
 * which can go stale (a demoted admin keeps `role: "ADMIN"` until the token
 * expires). Admin WRITES are already safe (requireAdmin re-reads the DB), but
 * without this an ex-admin could still VIEW /admin pages. checkPageAccess re-reads
 * the user's CURRENT role from the DB (one indexed lookup) and also honours the
 * session-revocation watermark, bouncing a non-admin to /dashboard and a
 * revoked/deleted account to /login — closing the read gap that the edge can't.
 *
 * Renders the same AppShell as the app, in admin mode — the sidebar exposes the
 * admin section (gated on role inside the shell), which is how admins move
 * between the app and admin areas. Stays a server component (it must await the
 * session); only the shell's drawer/collapse/active-link bits are client islands.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await checkPageAccess(true);
  if (!access.ok) redirect(access.reason === "not-admin" ? "/dashboard" : "/login");
  const { session } = access;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <AppShell
      role={session.user.role}
      userName={session.user.name ?? "Account"}
      userEmail={session.user.email ?? ""}
      signOut={
        <form action={handleSignOut} className="w-full">
          <Button variant="ghost" type="submit" role="menuitem" tabIndex={-1} className="w-full">
            Sign out
          </Button>
        </form>
      }
    >
      {children}
    </AppShell>
  );
}
