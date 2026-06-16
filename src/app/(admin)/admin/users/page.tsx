import type { Role } from "@prisma/client";

import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { POSITION_LABELS } from "@/lib/validations/auth";

export const metadata = { title: "Users" };

// v1 cap: show the most recent N users with a note rather than full pagination.
const USER_LIMIT = 100;

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** Accent pill for ADMIN, quiet text for USER — role is never colour-only. */
function RoleBadge({ role }: { role: Role }) {
  if (role === "ADMIN") {
    return (
      <span className="inline-flex rounded-full border border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-2 py-0.5 text-xs font-semibold tracking-wide text-[var(--accent)]">
        Admin
      </span>
    );
  }
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
 * mobile, a horizontally-scrollable table from `sm` up. Showing emails is
 * intentional — this is the owner's own admin view.
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

  const rows = users.map((user) => ({
    ...user,
    attempts: attemptsByUser.get(user.id) ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          Users
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          {rows.length === USER_LIMIT
            ? `Showing the ${USER_LIMIT} most recent users.`
            : `${rows.length} ${rows.length === 1 ? "user" : "users"} total.`}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--muted)]">
          No users yet.
        </p>
      ) : (
        <>
          {/* Mobile: one card per user. */}
          <ul className="flex flex-col gap-3 sm:hidden">
            {rows.map((user) => (
              <li key={user.id}>
                <Card className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--foreground)]">
                        {user.name}
                      </p>
                      <p className="truncate text-sm text-[var(--muted)]">
                        {user.email}
                      </p>
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
              </li>
            ))}
          </ul>

          {/* sm+: a table, horizontally scrollable inside its bordered surface
              so narrow viewports scroll rather than overflow the page. */}
          <div className="hidden overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] sm:block">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                  <th scope="col" className="px-4 py-3 font-medium">Name</th>
                  <th scope="col" className="px-4 py-3 font-medium">Email</th>
                  <th scope="col" className="px-4 py-3 font-medium">Position</th>
                  <th scope="col" className="px-4 py-3 font-medium">Institution</th>
                  <th scope="col" className="px-4 py-3 font-medium">Role</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Attempts</th>
                  <th scope="col" className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      {user.name}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{user.email}</td>
                    <td className="px-4 py-3">{POSITION_LABELS[user.position]}</td>
                    <td className="px-4 py-3">{user.institution}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{user.attempts}</td>
                    <td className="px-4 py-3 tabular-nums text-[var(--muted)]">
                      {dateFmt.format(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
