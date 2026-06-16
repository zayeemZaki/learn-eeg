import Link from "next/link";

interface BrandGlyphProps {
  /** Collapsed icon rail hides the wordmark, showing only the square glyph. */
  collapsed?: boolean;
}

/**
 * The sidebar brand mark: a small EEG-trace glyph in an accent-tinted square,
 * paired with the wordmark. This is the *only* place the waveform survives — as
 * a tasteful brand glyph, never again drawn behind text (the old dashboard
 * masthead waveform is gone). A single short alpha-rhythm-into-spike trace, the
 * same motif as the marketing hero but distilled to an icon. Tokens only; the
 * tint derives from --accent via color-mix.
 *
 * When the rail is collapsed the wordmark is dropped and only the square shows,
 * so the glyph reads at icon-rail width. Links home.
 */
export function BrandGlyph({ collapsed = false }: BrandGlyphProps) {
  return (
    <Link
      href="/dashboard"
      aria-label="EEG Quiz — home"
      className="inline-flex items-center gap-2.5 rounded-md outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_30%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          {/* Resting alpha rhythm that breaks into a single spike-and-wave —
              the product motif, distilled to a glyph. */}
          <path
            d="M2 12h2l1.5-3 1.5 6 1.5-9 2 14 2-12 1.5 4H22"
            stroke="var(--accent)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!collapsed ? (
        <span className="font-[family-name:var(--font-display)] text-base font-bold tracking-tight text-[var(--foreground)]">
          EEG Quiz
        </span>
      ) : null}
    </Link>
  );
}
