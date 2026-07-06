"use client";

import { useState, useTransition } from "react";
import { Position } from "@prisma/client";

import { registerUser, authenticate } from "@/app/actions/auth";
import { POSITION_LABELS } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";

/**
 * Step 3 of registration: the full form, reached only after email
 * verification (step 2). Email is pre-filled and read-only — it's the exact
 * address the otp_verified cookie attests to; letting it be edited here would
 * let a user "verify" one address and register a different one.
 */
export function CompleteRegistrationForm({ email }: { email: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    const payload = {
      name: formData.get("name"),
      email,
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      position: formData.get("position"),
      institution: formData.get("institution"),
    };

    startTransition(async () => {
      const created = await registerUser(payload);
      if (!created.ok) {
        setError(created.error);
        return;
      }
      // Auto sign-in then redirect to the dashboard, same as before.
      const signedIn = await authenticate({
        email: payload.email,
        password: payload.password,
      });
      if (!signedIn.ok) setError(signedIn.error);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Finish creating your account</h1>
      <form action={onSubmit} className="flex flex-col gap-4">
        <Field label="Full name" htmlFor="name">
          <input id="name" name="name" required className={inputClass()} />
        </Field>
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            value={email}
            readOnly
            disabled
            className={inputClass("cursor-not-allowed opacity-70")}
          />
        </Field>
        <PasswordField label="Password" name="password" autoComplete="new-password" minLength={8} />
        <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" minLength={8} />
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
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating account…" : "Sign up"}
        </Button>
      </form>
    </div>
  );
}
