"use client";

import { useRef, useState, useTransition } from "react";

import { changePassword } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";

/**
 * Self-service password change: current password (to authorize) + new password.
 * The action verifies the current password against the stored hash server-side
 * and returns a single "Current password is incorrect" on mismatch — the form
 * never learns more than that. Clears the fields on success.
 */
export function PasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    const payload = {
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
    };

    startTransition(async () => {
      const result = await changePassword(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Password updated.");
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="flex flex-col gap-4">
      <Field label="Current password" htmlFor="current-password">
        <input
          id="current-password"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass()}
        />
      </Field>
      <Field label="New password" htmlFor="new-password">
        <input
          id="new-password"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass()}
        />
      </Field>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? (
        <p className="text-sm text-[var(--accent)]" role="status">
          {success}
        </p>
      ) : null}

      <div className="flex">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Updating…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
