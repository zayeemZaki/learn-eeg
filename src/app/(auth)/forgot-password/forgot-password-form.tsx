"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { requestPasswordReset } from "@/app/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";

export function ForgotPasswordForm() {
  // The action is intentionally non-revealing, so success is uniform: once we've
  // submitted, we show the same confirmation no matter what the email was.
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      await requestPasswordReset({ email: formData.get("email") });
      // The action never distinguishes outcomes; neither do we.
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-sm text-[var(--muted)]">
          If an account exists for that address, we&apos;ve sent a link to reset
          your password. The link expires in one hour.
        </p>
        <p className="text-sm text-[var(--muted)]">
          <Link href="/login" className="text-[var(--accent)]">
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Reset your password</h1>
      <p className="text-sm text-[var(--muted)]">
        Enter the email tied to your account and we&apos;ll send you a link to
        choose a new password.
      </p>
      <form action={onSubmit} className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass()}
          />
        </Field>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="text-sm text-[var(--muted)]">
        Remembered it?{" "}
        <Link href="/login" className="text-[var(--accent)]">
          Log in
        </Link>
      </p>
    </div>
  );
}
