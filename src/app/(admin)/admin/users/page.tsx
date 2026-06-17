import Link from "next/link";
import type { Role } from "@prisma/client";

import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { POSITION_LABELS } from "@/lib/validations/auth";

export const metadata = { title: "Users" };

// v1 cap: show the most recent N users with a note rather than full pagination.
const USER_LIMIT = 100;

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

interface UserRow {
  id: string;
  name: string;
  email: string;
  position: keyof typeof POSITION_LABELS;
  institution: string;
  role: Role;
  createdAt: Date;
  attempts: number;
}

/** Accent pill for ADMIN, quiet text for USER — role is never colour-only. */
function RoleBadge({ role }: { role: Role }) {
  if (role === "ADMIN") return <Badge tone="accent">Admin</Badge>;
  return <span className="text-sm text-[var(--muted)]">User</span>;
}

/**
 * Admin users list: who has signed up, with their profile and attempt volume.
 *
 * Two queries total, no N+1: one explicit-field findMany for the users (note
 * the select never includes passwordHash) and one groupBy that counts attempts
 * per user. The counts are joined in memory via a Map.
 *
 * Layout is responsive without becoming an overflow mess: stacked cards on
 * mobile, a horizontally-scrollable table from `sm` up, via the shared
 * DataTable. Showing emails is intentional — this is the owner's own admin view.
 */
export default async function AdminUsersPage() {
  const [users, attemptGroups] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: USER_LIMIT,
      // Explicit fields only — passwordHash is deliberately excluded.
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
        institution: true,
        role: true,
        createdAt: true,
      },
    }),
    db.attempt.groupBy({
      by: ["userId"],
      _count: { _all: true },
    }),
  ]);

  // userId -> attempt count. Users with no attempts are simply absent → 0.
  const attemptsByUser = new Map(
    attemptGroups.map((g) => [g.userId, g._count._all]),
  );

  const rows: UserRow[] = users.map((user) => ({
    ...user,
    attempts: attemptsByUser.get(user.id) ?? 0,
  }));

  const columns: Column<UserRow>[] = [
    {
      header: "Name",
      cell: (u) => <span className="font-medium text-[var(--foreground)]">{u.name}</span>,
    },
    { header: "Email", cell: (u) => <span className="text-[var(--muted)]">{u.email}</span> },
    { header: "Position", cell: (u) => POSITION_LABELS[u.position] },
    { header: "Institution", cell: (u) => u.institution },
    { header: "Role", cell: (u) => <RoleBadge role={u.role} /> },
    { header: "Attempts", align: "right", cell: (u) => <span className="tabular-nums">{u.attempts}</span> },
    {
      header: "Joined",
      cell: (u) => (
        <span className="tabular-nums text-[var(--muted)]">{dateFmt.format(u.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description={
          rows.length === USER_LIMIT
            ? `Showing the ${USER_LIMIT} most recent users.`
            : `${rows.length} ${rows.length === 1 ? "user" : "users"} total.`
        }
      />

      {rows.length === 0 ? (
        <EmptyState message="No users yet." />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(u) => u.id}
          rowHref={(u) => `/admin/users/${u.id}`}
          rowLabel={(u) => `Edit ${u.name}`}
          renderCard={(user) => (
            // The whole card is the tap target (same as the desktop row): one
            // Link, hover affordance, and a visible focus ring.
            <Link
              href={`/admin/users/${user.id}`}
              aria-label={`Edit ${user.name}`}
              className="block rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              <Card className="flex flex-col gap-2 transition-colors hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--foreground)]">{user.name}</p>
                    <p className="truncate text-sm text-[var(--muted)]">{user.email}</p>
                  </div>
                  <RoleBadge role={user.role} />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <dt className="text-[var(--muted)]">Position</dt>
                    <dd>{POSITION_LABELS[user.position]}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted)]">Institution</dt>
                    <dd className="truncate">{user.institution}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted)]">Attempts</dt>
                    <dd className="tabular-nums">{user.attempts}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted)]">Joined</dt>
                    <dd className="tabular-nums">{dateFmt.format(user.createdAt)}</dd>
                  </div>
                </dl>
              </Card>
            </Link>
          )}
        />
      )}
    </div>
  );
}
