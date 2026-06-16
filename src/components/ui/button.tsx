import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "ghost";
type Size = "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const styles: Record<Variant, string> = {
  // Primary: a quiet single-tone accent fill with a barely-there gradient —
  // --accent into a slightly deepened accent (mixed toward black, no new
  // token, no hardcoded hex) — so the button reads as a calm utility action
  // rather than a loud marketing CTA. The deeper stop is darker than --accent,
  // so white text clears AA across the whole face. An accent-tinted shadow
  // lifts on hover and presses back on click.
  primary:
    "bg-gradient-to-b from-[var(--accent)] to-[color-mix(in_srgb,var(--accent)_88%,black)] text-white shadow-sm shadow-[color-mix(in_srgb,var(--accent)_35%,transparent)] hover:-translate-y-px hover:shadow-md hover:shadow-[color-mix(in_srgb,var(--accent)_45%,transparent)] active:translate-y-0 active:shadow-sm",
  // Ghost: subtle surface fill on hover with an accent-tinted border, so it
  // reads as interactive without competing with the primary action.
  ghost:
    "border border-[var(--border)] text-[var(--foreground)] hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:bg-[var(--surface)]",
};

// `md` reproduces the original (and only) button sizing, so every existing
// call site renders identically when `size` is omitted.
const sizes: Record<Size, string> = {
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

/** Minimal button primitive. Defaults to a submit-friendly primary style. */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className = "", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${styles[variant]} ${className}`}
      {...props}
    />
  );
});
