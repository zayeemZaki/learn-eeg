import { redirect } from "next/navigation";

import { signOut } from "@/auth";
import { checkPageAccess } from "@/lib/auth-guards";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/shell/app-shell";

/**
 * Guards every nested route. The proxy already redirects unauthenticated users;
 * re-checking here is defence in depth and gives us the session for the shell.
 *
 * checkPageAccess (not a bare auth() call) is what closes the stale-JWT READ gap:
 * the token alone cannot tell us whether the account still exists or whether a
 * credential change has since revoked this session, and the edge cannot either.
 * Stays a server component (it must await the session) — it derives the role/name
 * from the session it already holds and passes them to AppShell, whose only
 * interactive parts (drawer, active-link highlighting) are isolated client
 * islands.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const access = await checkPageAccess();
  if (!access.ok) redirect("/login");
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
