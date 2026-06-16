"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { authenticate } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await authenticate({
        email: formData.get("email"),
        password: formData.get("password"),
      });
      // On success the action redirects; we only reach here on failure.
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <form action={onSubmit} className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email">
          <input id="email" name="email" type="email" required className={inputClass()} />
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" name="password" type="password" required className={inputClass()} />
        </Field>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Signing in…" : "Log in"}
        </Button>
      </form>
      <p className="text-sm text-[var(--muted)]">
        No account?{" "}
        <Link href="/register" className="text-[var(--accent)]">
          Create one
        </Link>
      </p>
    </div>
  );
}
