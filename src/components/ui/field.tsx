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
      <label htmlFor={htmlFor} className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="flex items-start gap-1 text-xs font-medium text-danger">
          <span aria-hidden="true">!</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

// `focus:` rather than the Button's `focus-visible:` — a text input should show
// its ring on a mouse click too, since you need to see where you're about to type.
const baseControl =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none transition duration-150 " +
  "placeholder:text-[color-mix(in_srgb,var(--muted)_65%,transparent)] " +
  "hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))] " +
  "focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)] " +
  "disabled:cursor-not-allowed disabled:bg-[var(--background)] disabled:text-[var(--muted)] disabled:hover:border-[var(--border)]";

export function inputClass(extra = ""): string {
  return `${baseControl} ${extra}`;
}
