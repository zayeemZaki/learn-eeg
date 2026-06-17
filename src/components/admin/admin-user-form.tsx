"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Position, Role } from "@prisma/client";

import { updateUser } from "@/app/actions/admin-users";
import { type ActionResult } from "@/app/actions/admin-questions";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { POSITION_LABELS } from "@/lib/validations/auth";

interface AdminUserFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    position: Position;
    institution: string;
    role: Role;
  };
  /** True when the admin is editing their own row — the role control is locked. */
  isSelf: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  USER: "User",
  ADMIN: "Admin",
};

/**
 * Admin edit form for a user's details + role. Submits to updateUser (which
 * re-checks ADMIN and enforces the last-admin / self-role guards server-side).
 * Unlike the atlas/question forms, updateUser does NOT redirect — it revalidates
 * and stays — so on success we show inline feedback and refresh the route to pull
 * the new values (e.g. the page title/email in the header).
 *
 * The role <select> is disabled when the admin is editing their own row; the
 * server still refuses a self role-change as the real guard, and surfaces the
 * last-admin rule as a friendly error if a demotion would orphan /admin.
 */
export function AdminUserForm({ user, isSelf }: AdminUserFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      position: formData.get("position"),
      institution: formData.get("institution"),
      // Self-edit locks the role field (disabled inputs don't submit), so fall
      // back to the user's current role to keep the payload valid.
      role: isSelf ? user.role : formData.get("role"),
    };

    startTransition(async () => {
      const result: ActionResult = await updateUser(user.id, payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("User updated.");
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <Field label="Full name" htmlFor="admin-user-name">
        <input
          id="admin-user-name"
          name="name"
          required
          defaultValue={user.name}
          className={inputClass()}
        />
      </Field>

      <Field label="Email" htmlFor="admin-user-email">
        <input
          id="admin-user-email"
          name="email"
          type="email"
          required
          defaultValue={user.email}
          className={inputClass()}
        />
      </Field>

      <Field label="Position" htmlFor="admin-user-position">
        <select
          id="admin-user-position"
          name="position"
          defaultValue={user.position}
          className={inputClass()}
        >
          {(Object.values(Position) as Position[]).map((value) => (
            <option key={value} value={value}>
              {POSITION_LABELS[value]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Institution" htmlFor="admin-user-institution">
        <input
          id="admin-user-institution"
          name="institution"
          required
          defaultValue={user.institution}
          className={inputClass()}
        />
      </Field>

      <Field label="Role" htmlFor="admin-user-role">
        <select
          id="admin-user-role"
          name="role"
          defaultValue={user.role}
          disabled={isSelf}
          aria-describedby={isSelf ? "admin-user-role-hint" : undefined}
          className={inputClass(isSelf ? "opacity-60" : "")}
        >
          {(Object.values(Role) as Role[]).map((value) => (
            <option key={value} value={value}>
              {ROLE_LABELS[value]}
            </option>
          ))}
        </select>
        {isSelf ? (
          <p id="admin-user-role-hint" className="text-sm text-[var(--muted)]">
            You can&rsquo;t change your own role.
          </p>
        ) : null}
      </Field>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-[var(--accent)]" role="status">
          {success}
        </p>
      ) : null}

      <div className="flex">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
