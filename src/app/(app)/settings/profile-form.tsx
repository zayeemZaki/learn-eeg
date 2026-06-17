"use client";

import { useState, useTransition } from "react";

import { updateProfile, reauthAfterEmailChange } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";

/**
 * Self-service profile edit (name + email), pre-filled from the session the
 * server page already holds. Submits to the updateProfile action, which scopes
 * the write to the signed-in user.
 *
 * Email is the login key and the JWT caches it, so a successful email change
 * returns `reauth` — we then sign the user out to /login with a short note. A
 * name-only change just shows inline success (the new name appears on the next
 * navigation).
 */
export function ProfileForm({
  defaultName,
  defaultEmail,
}: {
  defaultName: string;
  defaultEmail: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reauthing, setReauthing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
    };

    startTransition(async () => {
      const result = await updateProfile(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.reauth) {
        // Email (the login key) changed — sign out and bounce to login so a
        // fresh token is issued. Keep the form disabled while we redirect; the
        // server action performs the signOut + redirect (throws a redirect).
        setReauthing(true);
        setSuccess("Email changed — please sign in again.");
        await reauthAfterEmailChange();
        return;
      }
      setSuccess("Profile updated.");
    });
  }

  const disabled = isPending || reauthing;

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <Field label="Full name" htmlFor="profile-name">
        <input
          id="profile-name"
          name="name"
          required
          defaultValue={defaultName}
          className={inputClass()}
        />
      </Field>
      <Field label="Email" htmlFor="profile-email">
        <input
          id="profile-email"
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
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
        <Button type="submit" disabled={disabled}>
          {reauthing ? "Signing out…" : isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
