import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
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
 * Renders the same AppShell as the app, in admin mode — the sidebar exposes the
 * admin section (gated on role inside the shell) and the topbar shows a "Back to
 * app" affordance. Stays a server component (it must await the session); only
 * the shell's drawer/collapse/active-link bits are client islands.
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
    <AppShell
      role={session.user.role}
      userName={session.user.name ?? "Account"}
      roleLabel="Admin"
      admin
      signOut={
        <form action={handleSignOut} className="w-full">
          <Button variant="ghost" type="submit" className="w-full">
            Sign out
          </Button>
        </form>
      }
    >
      {children}
    </AppShell>
  );
}
