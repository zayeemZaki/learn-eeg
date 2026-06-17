"use client";

import { useRef, useState, useTransition } from "react";

import { adminResetPassword } from "@/app/actions/admin-users";
import { type ActionResult } from "@/app/actions/admin-questions";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";

/**
 * Admin password reset for a user. No current-password is required — this is the
 * admin override path (adminResetPassword re-checks ADMIN server-side). Nothing
 * is emailed (no email infra until M6); the admin sets the new password directly
 * and communicates it out-of-band. Clears the field on success.
 */
export function AdminResetPasswordForm({ userId }: { userId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    const payload = { newPassword: formData.get("newPassword") };

    startTransition(async () => {
      const result: ActionResult = await adminResetPassword(userId, payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Password reset. Share the new password with the user.");
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="flex flex-col gap-4">
      <Field label="New password" htmlFor="admin-reset-password">
        <input
          id="admin-reset-password"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass()}
        />
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
          {isPending ? "Resetting…" : "Reset password"}
        </Button>
      </div>
    </form>
  );
}
