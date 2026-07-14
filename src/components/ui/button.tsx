import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "ghost" | "danger";
type Size = "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const styles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-[var(--accent)] to-[color-mix(in_srgb,var(--accent)_88%,black)] text-white shadow-sm shadow-[color-mix(in_srgb,var(--accent)_25%,transparent)] hover:shadow-md hover:shadow-[color-mix(in_srgb,var(--accent)_35%,transparent)] motion-safe:hover:-translate-y-px active:translate-y-0 active:shadow-xs",
  ghost:
    "border border-[var(--border)] text-[var(--foreground)] hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:bg-[var(--surface)] active:bg-[var(--background)]",
  danger:
    "bg-gradient-to-b from-[var(--danger)] to-[color-mix(in_srgb,var(--danger)_88%,black)] text-white shadow-sm shadow-[color-mix(in_srgb,var(--danger)_25%,transparent)] hover:shadow-md hover:shadow-[color-mix(in_srgb,var(--danger)_35%,transparent)] motion-safe:hover:-translate-y-px active:translate-y-0 active:shadow-xs focus-visible:ring-[var(--danger)]",
};

const sizes: Record<Size, string> = {
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

// The disabled rules neutralise the hover lift/shadow explicitly: opacity alone
// left a disabled button rising and casting a shadow on hover, so it looked
// pressable while refusing the press.
const base =
  "inline-flex items-center justify-center rounded-md font-medium outline-none transition duration-150 " +
  "focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 disabled:hover:shadow-none disabled:hover:translate-y-0";

/**
 * The button's classes, for elements that must look like a button but stay an
 * <a> (next/link anchors — wrapping a Button in a Link would nest interactive
 * elements and lose middle-click / open-in-new-tab).
 */
export function buttonClass(
  variant: Variant = "primary",
  size: Size = "md",
  className = "",
): string {
  return `${base} ${sizes[size]} ${styles[variant]} ${className}`;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className = "", ...props },
  ref,
) {
  return <button ref={ref} className={buttonClass(variant, size, className)} {...props} />;
});
