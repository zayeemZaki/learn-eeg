import { type ReactNode } from "react";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

import type { NavSection } from "@/components/shell/nav-config";
import { ShellChrome } from "@/components/shell/shell-chrome";
import {
  SIDEBAR_COOKIE,
  normalizeSidebarState,
} from "@/components/shell/sidebar-state";
import {
  DashboardIcon,
  QuestionsIcon,
  AtlasIcon,
  LiteratureIcon,
  OverviewIcon,
  UsersIcon,
} from "@/components/shell/nav-icons";

interface AppShellProps {
  /** From the session the layout already holds — never re-fetched here. */
  role: Role;
  userName: string;
  /** Shown in the account menu identity header. */
  userEmail: string;
  /** The server-action sign-out <form>, rendered into the account menu. */
  signOut: ReactNode;
  children: ReactNode;
}

// Primary app navigation — shown in both the app and admin shells.
const PRIMARY: NavSection = {
  items: [
    { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon />, match: "exact" },
    { href: "/questions", label: "Question Bank", icon: <QuestionsIcon /> },
    { href: "/atlas", label: "Atlas", icon: <AtlasIcon /> },
    { href: "/literature", label: "Literature", icon: <LiteratureIcon /> },
  ],
};

// Admin navigation — rendered only when role === "ADMIN".
const ADMIN: NavSection = {
  title: "Admin",
  items: [
    { href: "/admin", label: "Overview", icon: <OverviewIcon />, match: "exact" },
    { href: "/admin/questions", label: "Questions", icon: <QuestionsIcon /> },
    { href: "/admin/atlas", label: "Atlas", icon: <AtlasIcon /> },
    { href: "/admin/users", label: "Users", icon: <UsersIcon /> },
  ],
};

/**
 * The shell wrapper applied by both the (app) and (admin) layouts. Stays a
 * server component — it takes the role/name the layout already derived from the
 * session (no new fetch, no client conversion of the whole shell), assembles the
 * nav (gating the admin section on role === "ADMIN" so admin links are absent
 * from the DOM for everyone else, not merely hidden), and hands the interactive
 * pieces to the single ShellChrome client island.
 *
 * Both shells show the same primary nav; admins additionally get the admin
 * section, which is how they move between the app and admin areas. There is no
 * topbar — the sidebar is the only navigation, with a floating hamburger + brand
 * top-left and the account menu top-right.
 *
 * The desktop sidebar's chosen state (expanded / icon rail / hidden) is read
 * here from a cookie so the server renders the correct width on first paint —
 * the top-left hamburger writes the same cookie client-side, so the choice
 * survives reload with no localStorage and no hydration flash. Stays async
 * (cookies() is async in Next 16) but introduces no new fetch.
 */
export async function AppShell({ role, userName, userEmail, signOut, children }: AppShellProps) {
  const isAdmin = role === "ADMIN";
  const sections = isAdmin ? [PRIMARY, ADMIN] : [PRIMARY];

  const initialSidebar = normalizeSidebarState(
    (await cookies()).get(SIDEBAR_COOKIE)?.value,
  );

  return (
    <ShellChrome
      sections={sections}
      user={{ name: userName, email: userEmail }}
      signOut={signOut}
      initialSidebar={initialSidebar}
    >
      {children}
    </ShellChrome>
  );
}
