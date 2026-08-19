import { EegImage } from "@/components/ui/eeg-image";

interface ArticleFigureProps {
  src: string | null;
  /** Seeds the fallback so two articles rarely draw the same trace. */
  seed: string;
  /**
   * Describes an uploaded figure. Pass "" where the surrounding markup already
   * names the article (a card whose whole body is the link) so the image is not
   * announced twice. Unused by the generated fallback, which is always
   * decorative.
   */
  alt: string;
  className?: string;
}

// Four hand-authored trace shapes, each a repeating "beat" in relative SVG
// commands: a quiet rhythm, a spike-and-wave complex, a sharper burst, and a
// slow delta wave. An article without a figure gets one of these rather than an
// empty grey box, so the card still carries an EEG-shaped image.
// Every beat's vertical deltas sum to zero, so repeating one never walks the
// trace off the baseline the way an unbalanced segment would.
const TRACES = [
  "l10 -8 l10 14 l10 -14 l10 14 l10 -12 l10 10 l8 -30 l5 36 l7 -14 l10 4",
  "l12 -4 l12 8 l12 -8 l10 26 l6 -40 l6 44 l8 -22 l12 12 l12 -6 l10 -10",
  "l8 -14 l8 20 l8 -20 l8 18 l8 -16 l8 16 l8 -18 l8 18 l8 -16 l10 12",
  "l16 -20 l16 26 l16 -24 l16 22 l14 -18 l14 16 l10 -6 l10 6 l8 -4 l10 2",
];

/**
 * Sum of char codes — a stable, cheap hash. Only used to pick a decorative
 * variant, so distribution matters more than collision resistance.
 */
function traceFor(seed: string): string {
  let total = 0;
  for (let i = 0; i < seed.length; i += 1) total += seed.charCodeAt(i);
  return TRACES[total % TRACES.length]!;
}

/**
 * The figure band on an article card and reader page.
 *
 * Not every article has an uploaded figure, and EegImage's "No image"
 * placeholder reads as something missing when it repeats across a grid. So the
 * no-image case draws a generated EEG trace on an accent wash instead: purely
 * decorative, deterministic per article, and the same aspect ratio as a real
 * figure — the grid keeps one silhouette either way.
 */
export function ArticleFigure({ src, seed, alt, className = "" }: ArticleFigureProps) {
  if (src) return <EegImage src={src} alt={alt} className={className} />;

  const trace = traceFor(seed);
  // Each beat advances ~90 units, so eight repeats overrun the 600-wide viewBox
  // and the trace reaches the right edge instead of flatlining partway across.
  // Starting left of 0 keeps the first stroke from butting against the frame.
  const path = `M-20 100${` ${trace}`.repeat(8)}`;

  return (
    <div
      aria-hidden="true"
      className={`article-figure-fallback relative aspect-[16/9] w-full overflow-hidden ${className}`}
    >
      {/* Strip-chart paper, then the trace on top — the same two layers as the
          reader hero, so a generated figure still belongs to the same family. */}
      <div className="eeg-grid absolute inset-0" />
      <svg
        viewBox="0 0 600 200"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path
          d={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeOpacity="0.45"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
