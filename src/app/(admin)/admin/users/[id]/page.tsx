import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { AdminUserForm } from "@/components/admin/admin-user-form";
import { AdminResetPasswordForm } from "@/components/admin/admin-reset-password-form";
import { DeleteUserButton } from "@/components/admin/delete-user-button";

export const metadata = { title: "Edit user" };

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [session, user] = await Promise.all([
    auth(),
    db.user.findUnique({
      where: { id },
      // Explicit fields only — passwordHash is deliberately excluded.
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
        institution: true,
        role: true,
      },
    }),
  ]);
  if (!user) notFound();

  const isSelf = session?.user?.id === user.id;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={user.name}
        description={user.email}
        back={{ href: "/admin/users", label: "Back to users" }}
      />

      <SectionPanel title="Details">
        <AdminUserForm user={user} isSelf={isSelf} />
      </SectionPanel>

      <SectionPanel title="Reset password">
        <AdminResetPasswordForm userId={user.id} />
      </SectionPanel>

      <SectionPanel title="Danger zone">
        <DeleteUserButton id={user.id} name={user.name} disabled={isSelf} />
      </SectionPanel>
    </div>
  );
}
