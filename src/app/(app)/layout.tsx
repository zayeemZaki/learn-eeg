import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/shell/app-shell";

/**
 * Guards every nested route. Middleware already redirects unauthenticated
 * users; re-checking here is defence in depth and gives us the session for the
 * shell. Stays a server component (it must await the session) — it derives the
 * role/name from the session it already holds (no new fetch) and passes them to
 * AppShell, whose only interactive parts (drawer, active-link highlighting) are
 * isolated client islands.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

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
