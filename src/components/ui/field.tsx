import { type ReactNode } from "react";

/** Labelled form control wrapper with inline error display. */
export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-[var(--muted)]">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// Shared control styling. Slightly larger radius (rounded-xl) for a modern
// feel, with a clear focus state: the border turns accent and an accent ring
// blooms on keyboard/focus, matching the Button's focus-visible treatment.
const baseControl =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]";

export function inputClass(extra = ""): string {
  return `${baseControl} ${extra}`;
}
