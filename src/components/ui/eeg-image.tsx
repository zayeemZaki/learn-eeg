import { ImageIcon } from "@/components/ui/icons";

interface EegImageProps {
  /** The image URL. When missing/empty, the framed placeholder is shown. */
  src?: string | null;
  /** Required: every EEG image must be described for screen readers. */
  alt: string;
  className?: string;
  /** Label shown in the empty state (defaults to "No image"). */
  emptyLabel?: string;
}

/**
 * One consistent frame for every EEG image in the app — question stems, atlas
 * entries, admin thumbnails, and the upload preview alike. A hairline --border
 * card on a faint --background surface holds the trace, which is `object-contain`ed
 * so it is never stretched or distorted at any width. A fixed aspect ratio
 * reserves the space before the image loads, so framed images don't cause layout
 * shift.
 *
 * When `src` is missing or empty the SAME frame renders an intentional, on-theme
 * empty state — a muted picture glyph above a small "No image" label — never a
 * bare grey box that reads as a broken image. So callers can always render
 * <EegImage>; it decides *how* an image (or its absence) looks, the caller only
 * decides *whether* to render the frame at all.
 *
 * DRY: the quiz, the atlas, the admin tables, and the uploader all render through
 * this, so the image treatment (and the empty state) stays identical app-wide.
 */
export function EegImage({ src, alt, className = "", emptyLabel = "No image" }: EegImageProps) {
  const frame = `aspect-[16/9] w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] ${className}`;

  if (!src) {
    return (
      <div
        className={frame}
        role="img"
        aria-label={emptyLabel}
      >
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-[var(--muted)]">
          <ImageIcon className="h-6 w-6 shrink-0" />
          <span className="text-xs font-medium">{emptyLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={frame}>
      {/* Plain <img> (not next/image) keeps remote/seed URLs config-free; the
          fixed-ratio frame above is what prevents layout shift. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-contain" />
    </div>
  );
}
