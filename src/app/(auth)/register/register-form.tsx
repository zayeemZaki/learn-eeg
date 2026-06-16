"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Position } from "@prisma/client";

import { registerUser, authenticate } from "@/app/actions/auth";
import { POSITION_LABELS } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      position: formData.get("position"),
      institution: formData.get("institution"),
    };

    startTransition(async () => {
      const created = await registerUser(payload);
      if (!created.ok) {
        setError(created.error);
        return;
      }
      // Auto sign-in then redirect to the dashboard.
      const signedIn = await authenticate({
        email: payload.email,
        password: payload.password,
      });
      if (!signedIn.ok) setError(signedIn.error);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <form action={onSubmit} className="flex flex-col gap-4">
        <Field label="Full name" htmlFor="name">
          <input id="name" name="name" required className={inputClass()} />
        </Field>
        <Field label="Email" htmlFor="email">
          <input id="email" name="email" type="email" required className={inputClass()} />
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" name="password" type="password" required minLength={8} className={inputClass()} />
        </Field>
        <Field label="Position" htmlFor="position">
          <select id="position" name="position" required defaultValue="" className={inputClass()}>
            <option value="" disabled>
              Select…
            </option>
            {(Object.values(Position) as Position[]).map((value) => (
              <option key={value} value={value}>
                {POSITION_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Current institution" htmlFor="institution">
          <input id="institution" name="institution" required className={inputClass()} />
        </Field>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating account…" : "Sign up"}
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
