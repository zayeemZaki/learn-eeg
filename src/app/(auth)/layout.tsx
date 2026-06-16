import { BrandMark } from "@/components/site/brand-mark";
import { EegWaveform } from "@/components/site/eeg-waveform";

/**
 * Split auth layout, shared by /login and /register.
 *
 * LEFT (lg+ only): a --surface-tinted brand panel that reuses the marketing
 * EEG waveform as ambient identity, with the brand mark up top and one quiet
 * line of value copy at the bottom. The signature of the page — kept calm.
 *
 * RIGHT: the form panel. Vertically centered, comfortable max-width, generous
 * spacing. The page's form renders here as {children}. The eyebrow/subhead is
 * defined here once so both pages share it.
 *
 * Below lg the brand panel drops away and the form centers on its own, but a
 * brand mark stays pinned at the top so mobile keeps its identity.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* LEFT — brand panel (hidden below lg). */}
      <aside className="relative hidden overflow-hidden border-r border-[var(--border)] bg-[var(--surface)] lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Ambient identity: the EEG trace, edge-faded by its own mask, drifting
            across the panel's vertical center so it never fights the copy. */}
        <EegWaveform className="pointer-events-none absolute inset-x-0 top-1/2 h-56 w-full -translate-y-1/2 opacity-70" />

        {/* Brand mark, top. */}
        <div className="relative">
          <BrandMark size="md" />
        </div>

        {/* Value copy, bottom — one quiet line. */}
        <p className="relative max-w-sm text-sm text-[var(--muted)]">
          Practice the patterns that matter — question bank, atlas, and the
          latest literature.
        </p>
      </aside>

      {/* RIGHT — form panel. */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-10">
        {/* Mobile-only brand mark so small screens keep their identity. */}
        <div className="mb-10 lg:hidden">
          <BrandMark size="md" />
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-col gap-6">
          {/* Shared eyebrow/subhead — defined once for both pages. */}
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
            Pattern mastery for EEG readers
          </p>
          {children}
        </div>
      </div>
    </main>
  );
}
