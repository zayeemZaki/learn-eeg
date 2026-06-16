import { type ReactNode } from "react";
import type { Role } from "@prisma/client";

import type { NavSection } from "@/components/shell/nav-config";
import { ShellChrome } from "@/components/shell/shell-chrome";
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
  /** Human role label for the user block (e.g. "Resident", "Admin"). */
  roleLabel: string;
  /** Whether this is the admin shell (adds the "Back to app" topbar link). */
  admin?: boolean;
  /** The server-action sign-out <form>, rendered into the user block. */
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

// Topbar titles, matched by path prefix (longest wins, resolved in ShellChrome).
const TITLES = [
  { prefix: "/dashboard", title: "Dashboard" },
  { prefix: "/questions", title: "Question Bank" },
  { prefix: "/atlas", title: "Atlas" },
  { prefix: "/literature", title: "Literature" },
  { prefix: "/admin/questions", title: "Questions" },
  { prefix: "/admin/atlas", title: "Atlas" },
  { prefix: "/admin/users", title: "Users" },
  { prefix: "/admin", title: "Admin Overview" },
];

/**
 * The shell wrapper applied by both the (app) and (admin) layouts. Stays a
 * server component — it takes the role/name the layout already derived from the
 * session (no new fetch, no client conversion of the whole shell), assembles the
 * nav (gating the admin section on role === "ADMIN" so admin links are absent
 * from the DOM for everyone else, not merely hidden), and hands the interactive
 * pieces to the single ShellChrome client island.
 *
 * The admin shell shows the same primary + admin nav (admins move freely between
 * the app and admin areas) plus a "Back to app" topbar affordance.
 */
export function AppShell({
  role,
  userName,
  roleLabel,
  admin = false,
  signOut,
  children,
}: AppShellProps) {
  const isAdmin = role === "ADMIN";
  const sections = isAdmin ? [PRIMARY, ADMIN] : [PRIMARY];

  return (
    <ShellChrome
      sections={sections}
      user={{ name: userName, roleLabel, isAdmin }}
      titles={TITLES}
      fallbackTitle={admin ? "Admin" : "Dashboard"}
      showBackToApp={admin}
      signOut={signOut}
    >
      {children}
    </ShellChrome>
  );
}
