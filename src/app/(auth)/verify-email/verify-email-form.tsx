"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { sendOtp, verifyOtp } from "@/app/actions/otp";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";

export function VerifyEmailForm({ email }: { email: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setResent(false);
    const code = String(formData.get("code") ?? "");

    startTransition(async () => {
      const result = await verifyOtp({ code });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/register/complete");
    });
  }

  function onResend() {
    setError(null);
    startResendTransition(async () => {
      await sendOtp({ email });
      setResent(true);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Check your email</h1>
      <p className="text-sm text-[var(--muted)]">
        We sent a 6-digit code to <span className="font-medium text-[var(--foreground)]">{email}</span>.
        Enter it below — it expires in 10 minutes.
      </p>
      <form action={onSubmit} className="flex flex-col gap-4">
        <Field label="Verification code" htmlFor="code">
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            className={`${inputClass()} text-center text-lg tracking-[0.5em]`}
          />
        </Field>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Verifying…" : "Verify code"}
        </Button>
      </form>
      <p className="text-sm text-[var(--muted)]">
        Didn&apos;t get a code?{" "}
        <button
          type="button"
          onClick={onResend}
          disabled={isResending}
          className="text-[var(--accent)] disabled:opacity-50"
        >
          {isResending ? "Sending…" : "Resend code"}
        </button>
      </p>
      {resent ? (
        <p role="status" className="text-sm text-success">
          A new code is on its way, if the address is deliverable.
        </p>
      ) : null}
      <p className="text-sm text-[var(--muted)]">
        Wrong email?{" "}
        <Link href="/register" className="text-[var(--accent)]">
          Start over
        </Link>
      </p>
    </div>
  );
}
