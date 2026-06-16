import { BrandMark } from "./brand-mark";

const footerLink =
  "rounded-md text-sm text-[var(--muted)] outline-none transition hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

/**
 * Marketing footer: brand mark + copyright on the left, a quiet developer
 * credit on the right. Stacks vertically and centers on mobile; sits on one row
 * from `sm` up.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-8 sm:flex-row sm:items-center">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <BrandMark size="sm" />
          <p className="text-sm text-[var(--muted)]">
            © 2026 EEG Quiz
          </p>
        </div>

        <p className="font-[family-name:var(--font-display)] text-xs text-[var(--muted)]">
          Developed by{" "}
          <a
            href="https://www.linkedin.com/in/zayeem-zaki/"
            target="_blank"
            rel="noopener noreferrer"
            className={footerLink}
          >
            Zayeem Zaki
          </a>
        </p>
      </div>
    </footer>
  );
}
