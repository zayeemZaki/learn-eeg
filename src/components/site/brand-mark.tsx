import Link from "next/link";
import Image from "next/image";

interface BrandMarkProps {
  /** Render as a link (header/footer) or as plain inline content. */
  href?: string;
  /** Visual size; `sm` suits the footer, `md` the header. */
  size?: "sm" | "md";
}

const textSize = {
  sm: "text-base",
  md: "text-lg",
} as const;

// Pixel dimensions for the logo image at each size. next/image needs explicit
// intrinsic dimensions; the rendered box matches these (the source is square).
const glyphPx = {
  sm: 24,
  md: 28,
} as const;

/**
 * The product's wordmark: the EEGQUIZ.COM brain emblem (public/logo.jpg) paired
 * with the name set in the display typeface. Single source of truth so every
 * surface — marketing header/footer, app header, auth pages — shares one mark
 * and never drifts. Defaults to linking home.
 */
export function BrandMark({ href = "/", size = "md" }: BrandMarkProps) {
  const px = glyphPx[size];
  const content = (
    <span className="inline-flex items-center gap-2">
      <Image
        src="/logo.jpg"
        alt=""
        width={px}
        height={px}
        priority
        className="rounded-md"
        style={{ width: px, height: px }}
      />
      <span
        className={`font-[family-name:var(--font-display)] font-bold tracking-tight ${textSize[size]}`}
      >
        EEG Quiz
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="rounded-md outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
    >
      {content}
    </Link>
  );
}
