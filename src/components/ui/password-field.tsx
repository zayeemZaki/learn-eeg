"use client";

import { useId, useState } from "react";

import { Field, inputClass } from "@/components/ui/field";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path d="M1.5 12s4-7.5 10.5-7.5S22.5 12 22.5 12s-4 7.5-10.5 7.5S1.5 12 1.5 12Z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
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

export function PasswordField({
  label,
  name,
  autoComplete,
  minLength,
  defaultId,
  error,
}: {
  label: string;
  name: string;
  autoComplete: "new-password" | "current-password";
  minLength?: number;
  defaultId?: string;
  error?: string;
}) {
  const generatedId = useId();
  const id = defaultId ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <Field label={label} htmlFor={id} error={error}>
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
          className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-3 text-[var(--muted)] outline-none transition-colors hover:text-[var(--foreground)] focus-visible:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
        >
          <EyeIcon open={visible} />
        </button>
      </div>
    </Field>
  );
}
