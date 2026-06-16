import Link from "next/link";

interface SectionCardProps {
  href: string;
  title: string;
  body: string;
}

/**
 * A clickable navigation card: title in the display font, --muted description,
 * and an arrow affordance pinned to the bottom that slides on hover. The whole
 * card lifts and gains an accent border on hover/focus, and shows a visible
 * focus ring for keyboard users. Equal-height by design (flex column) so a row
 * of them lines up regardless of body length.
 *
 * Shared by the dashboard section grid and the atlas category grid so the
 * "browse to a section" card looks identical everywhere it appears. Hover/focus
 * motion is suppressed under prefers-reduced-motion (see globals.css).
 */
export function SectionCard({ href, title, body }: SectionCardProps) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 outline-none transition motion-safe:hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
    >
      <h2 className="font-[family-name:var(--font-display)] font-bold tracking-tight">
        {title}
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{body}</p>
      <span
        aria-hidden="true"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] transition-transform motion-safe:group-hover:translate-x-0.5"
      >
        Open
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
          <path
            d="M3 8h9M9 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Link>
  );
}
