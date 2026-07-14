import { ImageIcon } from "@/components/ui/icons";

interface EegImageProps {
  /** The image URL. When missing/empty, the framed placeholder is shown. */
  src?: string | null;
  /** Required: every EEG image must be described for screen readers. */
  alt: string;
  className?: string;
  emptyLabel?: string;
}

/**
 * One consistent frame for every EEG image in the app. A fixed aspect ratio
 * reserves the space before load (no layout shift), and a missing src renders an
 * intentional empty state rather than a broken-image box.
 */
export function EegImage({ src, alt, className = "", emptyLabel = "No image" }: EegImageProps) {
  const frame = `aspect-[16/9] w-full overflow-hidden rounded-md border border-[var(--border)] bg-[var(--background)] ${className}`;

  if (!src) {
    return (
      <div className={frame} role="img" aria-label={emptyLabel}>
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-[var(--muted)]">
          <ImageIcon className="h-6 w-6 shrink-0" />
          <span className="text-xs font-medium">{emptyLabel}</span>
        </div>
      </div>
    );
  }

  return (
    // `eeg-image-frame` shimmers BEHIND the image, which fades in and occludes it
    // on decode — so there's no loading flag, and this stays a server component.
    <div className={`eeg-image-frame ${frame}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="eeg-image-img h-full w-full object-contain"
      />
    </div>
  );
}
