"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { sendOtp } from "@/app/actions/otp";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";

/**
 * Step 1 of registration: email only. On submit, sendOtp mints and emails a
 * 6-digit code (always returning a generic success — see otp.ts) and we move
 * on to /verify-email. The account itself isn't created until step 3.
 */
export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "");

    startTransition(async () => {
      await sendOtp({ email });
      router.push("/verify-email");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="text-sm text-[var(--muted)]">
        Enter your email and we&apos;ll send you a 6-digit verification code to
        get started.
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
          {isPending ? "Sending…" : "Send verification code"}
        </Button>
      </form>
      <p className="text-sm text-[var(--muted)]">
        Already registered?{" "}
        <Link href="/login" className="text-[var(--accent)]">
          Log in
        </Link>
      </p>
    </div>
  );
}
