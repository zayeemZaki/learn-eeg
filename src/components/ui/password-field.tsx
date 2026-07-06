"use client";

import { useId, useState } from "react";

import { Field, inputClass } from "@/components/ui/field";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    // Open eye — password is currently visible as plain text.
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path d="M1.5 12s4-7.5 10.5-7.5S22.5 12 22.5 12s-4 7.5-10.5 7.5S1.5 12 1.5 12Z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // Closed/slashed eye — password is currently masked.
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10.5 7 10.5 7a17.6 17.6 0 0 1-4 4.7M6.3 6.9C3.5 8.8 1.5 12 1.5 12s4 7 10.5 7c1.4 0 2.7-.3 3.9-.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Password input with a show/hide toggle. Wraps Field/inputClass so it drops
 * into the same form layout as every other field; the toggle button is
 * type="button" so it never submits the form, and carries an aria-label that
 * flips with its state for screen readers.
 */
export function PasswordField({
  label,
  name,
  autoComplete,
  minLength,
  defaultId,
}: {
  label: string;
  name: string;
  autoComplete: "new-password" | "current-password";
  minLength?: number;
  /** Optional explicit id; defaults to a generated one. */
  defaultId?: string;
}) {
  const generatedId = useId();
  const id = defaultId ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <Field label={label} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          className={inputClass("pr-10")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <EyeIcon open={visible} />
        </button>
      </div>
    </Field>
  );
}
