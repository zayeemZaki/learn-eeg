"use client";

import { useRef, useState, useTransition } from "react";

import { changePassword } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";

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
      <PasswordField
        label="Current password"
        name="currentPassword"
        autoComplete="current-password"
        defaultId="current-password"
      />
      <PasswordField
        label="New password"
        name="newPassword"
        autoComplete="new-password"
        minLength={8}
        defaultId="new-password"
      />

      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
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
