import { type ReactNode } from "react";

/**
 * The one badge primitive — replaces every ad-hoc pill and inline status marker
 * across the app (the atlas CategoryBadge, the users RoleBadge, the question
 * answered/correct markers). Status, role, and category are NEVER conveyed by
 * colour alone: every tone pairs its colour with the label text (and callers
 * pass an icon where the original markup had one), so the meaning survives for
 * colour-blind and monochrome readers.
 *
 * `tone` picks the colour treatment; `solid` (the default) is a filled pill,
 * while `subtle` is a borderless icon+label marker for the inline correct /
 * incorrect hints that were previously bare coloured spans. Tokens only — the
 * accent tone derives from --accent via color-mix, no new colour is introduced;
 * the semantic positive/negative tones map to the --success / --danger tokens, so
 * correctness styling stays consistent with every other state colour in the app.
 */
type Tone = "accent" | "neutral" | "positive" | "negative";
type Variant = "solid" | "subtle";

interface BadgeProps {
  children: ReactNode;
  /** Colour treatment; defaults to the quiet accent pill. */
  tone?: Tone;
  /** `solid` = filled pill, `subtle` = borderless inline icon+label marker. */
  variant?: Variant;
  /** Optional leading glyph, rendered before the label. */
  icon?: ReactNode;
  className?: string;
}

// Filled pills: a hairline border, a faint fill, and the tone's text colour.
// The accent pill reproduces the previous CategoryBadge / RoleBadge markup
// exactly (color-mix off --accent); positive/negative use the --success /
// --danger tokens (base text + -soft fill) so semantics never drift.
const solidTone: Record<Tone, string> = {
  accent:
    "border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)]",
  neutral: "border-[var(--border)] bg-[var(--background)] text-[var(--muted)]",
  positive: "border-success/40 bg-success-soft text-success",
  negative: "border-danger/40 bg-danger-soft text-danger",
};

// Borderless inline markers (the old "✓ Correct" / "✗ Incorrect" hint spans).
const subtleTone: Record<Tone, string> = {
  accent: "text-[var(--accent)]",
  neutral: "text-[var(--muted)]",
  positive: "text-success",
  negative: "text-danger",
};

export function Badge({
  children,
  tone = "accent",
  variant = "solid",
  icon,
  className = "",
}: BadgeProps) {
  if (variant === "subtle") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold ${subtleTone[tone]} ${className}`}
      >
        {icon}
        {children}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold tracking-wide ${solidTone[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
