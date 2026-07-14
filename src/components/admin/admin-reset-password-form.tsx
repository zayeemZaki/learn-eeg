"use client";

import { useRef, useState, useTransition } from "react";

import { adminResetPassword } from "@/app/actions/admin-users";
import { type ActionResult } from "@/app/actions/admin-questions";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";

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
      <PasswordField
        label="New password"
        name="newPassword"
        autoComplete="new-password"
        minLength={8}
        defaultId="admin-reset-password"
      />

      {error ? (
        <p role="alert" className="text-sm text-danger">
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
