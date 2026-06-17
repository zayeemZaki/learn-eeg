"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { resetPassword } from "@/app/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);

    const newPassword = String(formData.get("newPassword") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    // Client-side confirm check — the server only needs token + newPassword.
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

  // A missing token means the link was malformed or stripped — guide the user
  // back to request a fresh one rather than showing a dead form.
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
        <Field label="New password" htmlFor="newPassword">
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass()}
          />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm">
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass()}
          />
        </Field>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
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
