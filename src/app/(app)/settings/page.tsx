import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { Badge } from "@/components/ui/badge";
import { POSITION_LABELS } from "@/lib/validations/auth";

export const metadata = { title: "Settings" };

/**
 * Account settings — placeholder for M4. Editing your name / email / password
 * lands in M5; for now this page renders the signed-in user's current account
 * details read-only so the account menu's "Settings" link resolves to a real,
 * on-theme page rather than a 404. No actions, no forms, no mutations here.
 *
 * The (app) layout already guards the route; we re-read the session only to show
 * the user their own details (the same session the layout holds — no new fetch
 * of other data).
 */
export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { name, email, position, institution, role } = session.user;
  const roleLabel = role === "ADMIN" ? "Admin" : POSITION_LABELS[position];

  const rows: { label: string; value: string }[] = [
    { label: "Name", value: name ?? "—" },
    { label: "Email", value: email ?? "—" },
    { label: "Institution", value: institution },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Settings"
        description="Your account details. Editing arrives in a later update."
      />

      <SectionPanel
        title="Account"
        aside={
          role === "ADMIN" ? (
            <Badge tone="accent">{roleLabel}</Badge>
          ) : (
            <Badge tone="neutral">{roleLabel}</Badge>
          )
        }
      >
        <dl className="divide-y divide-[var(--border)]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
            >
              <dt className="text-sm text-[var(--muted)]">{row.label}</dt>
              <dd className="min-w-0 truncate text-sm font-medium text-[var(--foreground)] sm:text-right">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </SectionPanel>

      <SectionPanel title="Editing your profile">
        <p className="text-sm text-[var(--muted)]">
          Updating your name, email, and password — plus password reset — is
          coming soon. For now these details are managed for you.
        </p>
      </SectionPanel>
    </div>
  );
}
