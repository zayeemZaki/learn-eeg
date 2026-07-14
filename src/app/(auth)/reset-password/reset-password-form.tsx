"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { resetPassword } from "@/app/actions/password-reset";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);

    const newPassword = String(formData.get("newPassword") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (newPassword !== confirm) {
      setError("Passwords don't match");
      return;
    }

    startTransition(async () => {
      const result = await resetPassword({ token, newPassword });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Do NOT auto-login from the reset flow: send to login with a notice.
      router.push("/login?reset=success");
    });
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-bold">Invalid reset link</h1>
        <p className="text-sm text-[var(--muted)]">
          This password-reset link is missing or malformed. Request a new one to
          continue.
        </p>
        <p className="text-sm text-[var(--muted)]">
          <Link href="/forgot-password" className="text-[var(--accent)]">
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      <form action={onSubmit} className="flex flex-col gap-4">
        <PasswordField
          label="New password"
          name="newPassword"
          autoComplete="new-password"
          minLength={8}
          defaultId="newPassword"
        />
        <PasswordField
          label="Confirm new password"
          name="confirm"
          autoComplete="new-password"
          minLength={8}
          defaultId="confirm"
        />
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Updating…" : "Update password"}
        </Button>
      </form>
      <p className="text-sm text-[var(--muted)]">
        <Link href="/login" className="text-[var(--accent)]">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
