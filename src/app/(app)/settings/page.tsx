import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { Badge } from "@/components/ui/badge";
import { POSITION_LABELS } from "@/lib/validations/auth";
import { ProfileForm } from "@/app/(app)/settings/profile-form";
import { PasswordForm } from "@/app/(app)/settings/password-form";

export const metadata = { title: "Settings" };

/**
 * Account settings (M5). Lets a signed-in user edit their own name / email and
 * change their password. The (app) layout already guards the route; we re-read
 * the session only to pre-fill the forms with the user's own details (no fetch
 * of anyone else's data). The actual writes happen in self-scoped server actions
 * (account.ts) — this page just renders and seeds the forms.
 *
 * Position / institution / role stay read-only here: a user's clinical position
 * and institution are set at registration and their role is admin-controlled, so
 * only name / email / password are self-editable.
 */
export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { name, email, position, institution, role } = session.user;
  const roleLabel = role === "ADMIN" ? "Admin" : POSITION_LABELS[position];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Settings" description="Manage your account details." />

      <SectionPanel title="Profile">
        <ProfileForm defaultName={name ?? ""} defaultEmail={email ?? ""} />
      </SectionPanel>

      <SectionPanel title="Password">
        <PasswordForm />
      </SectionPanel>

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
          {[
            { label: "Position", value: POSITION_LABELS[position] },
            { label: "Institution", value: institution },
          ].map((row) => (
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
    </div>
  );
}
