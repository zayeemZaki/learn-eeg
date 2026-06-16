interface EegWaveformProps {
  className?: string;
}

// A single repeating "beat" of the trace, authored to read like a real EEG:
// a run of low-amplitude alpha-rhythm oscillation, then one sharp
// spike-and-wave complex. Drawn once here and tiled across the full width by
// repeating the segment, so the rhythm stays even at any viewport size.
const ALPHA =
  "l8 -6 l8 12 l8 -12 l8 12 l8 -12 l8 12 l8 -10 l8 8 l8 -8 l8 8";
const SPIKE = "l6 -34 l4 40 l6 -16 l10 16";
const SEGMENT = `${ALPHA} ${SPIKE} l8 0`;

// The trace path: start at the vertical midline, then repeat the segment to
// fill a wide viewBox. `viewBox` width (1200) comfortably exceeds the segment
// run so the line always reaches the right edge.
const TRACE = `M0 90 ${SEGMENT} ${SEGMENT} ${SEGMENT} ${SEGMENT} ${SEGMENT} L1200 90`;

/**
 * The hero's signature: an EEG waveform trace rendered as inline SVG.
 *
 * A quiet baseline oscillates like an alpha rhythm and breaks into an
 * occasional spike-and-wave complex, all in the accent color. A short bright
 * dash sweeps left to right along the exact same path — the `.eeg-sweep` class
 * (see globals.css) animates `stroke-dashoffset`, and pauses under
 * `prefers-reduced-motion`. No client JS required.
 */
export function EegWaveform({ className = "" }: EegWaveformProps) {
  return (
    <svg
      viewBox="0 0 1200 180"
      preserveAspectRatio="none"
      role="img"
      aria-label="An EEG waveform trace with an alpha rhythm and a spike-and-wave complex."
      className={className}
    >
      <defs>
        {/* Edge fade as a true ALPHA mask: white (opaque) in the middle fading
            to transparent at both edges. Because the mask itself is the alpha
            channel, the trace fades to *nothing* on any background — no color
            literal, no background-colored gradient to smudge a light page. */}
        <linearGradient id="eeg-edge-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="0.12" stopColor="white" stopOpacity="1" />
          <stop offset="0.88" stopColor="white" stopOpacity="1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="eeg-edge-mask">
          <rect width="1200" height="180" fill="url(#eeg-edge-fade)" />
        </mask>
      </defs>

      <g mask="url(#eeg-edge-mask)">
        {/* Resting trace: sits behind the headline. Opacity bumped from the
            dark-theme 0.35 so the accent stroke still reads crisply on
            near-white. */}
        <path
          d={TRACE}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeOpacity="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Sweep highlight: a bright dash traveling along the same path. The
            long gap leaves only one visible segment at a time, like a monitor's
            refresh cursor. Full-opacity accent so the cursor pops on white. */}
        <path
          className="eeg-sweep"
          d={TRACE}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="120 1000"
        />
      </g>
    </svg>
  );
}
