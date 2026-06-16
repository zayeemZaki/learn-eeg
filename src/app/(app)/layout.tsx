import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/shell/app-shell";
import { POSITION_LABELS } from "@/lib/validations/auth";

/**
 * Guards every nested route. Middleware already redirects unauthenticated
 * users; re-checking here is defence in depth and gives us the session for the
 * shell. Stays a server component (it must await the session) — it derives the
 * role/name from the session it already holds (no new fetch) and passes them to
 * AppShell, whose only interactive parts (drawer/collapse, active-link
 * highlighting) are isolated client islands.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  // ADMIN reads as the role; everyone else shows their clinical position.
  const roleLabel =
    session.user.role === "ADMIN" ? "Admin" : POSITION_LABELS[session.user.position];

  return (
    <AppShell
      role={session.user.role}
      userName={session.user.name ?? "Account"}
      roleLabel={roleLabel}
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
