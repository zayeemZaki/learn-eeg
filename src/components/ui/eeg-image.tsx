interface EegImageProps {
  src: string;
  /** Required: every EEG image must be described for screen readers. */
  alt: string;
  className?: string;
}

/**
 * One consistent frame for every EEG image in the app — question stems and
 * atlas entries alike. A hairline --border card on a faint --background surface
 * holds the trace, which is `object-contain`ed so it is never stretched or
 * distorted at any width. A fixed aspect ratio reserves the space before the
 * image loads, so framed images don't cause layout shift.
 *
 * DRY: the quiz and the atlas both render through this, so the image treatment
 * stays identical across the app. Callers decide *whether* to render it (e.g.
 * a question may have no image); this component only decides *how*.
 */
export function EegImage({ src, alt, className = "" }: EegImageProps) {
  return (
    <div
      className={`aspect-[16/9] w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] ${className}`}
    >
      {/* Plain <img> (not next/image) keeps remote/seed URLs config-free; the
          fixed-ratio frame above is what prevents layout shift. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-contain" />
    </div>
  );
}
