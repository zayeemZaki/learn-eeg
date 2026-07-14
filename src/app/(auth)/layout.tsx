import { BrandMark } from "@/components/site/brand-mark";
import { EegWaveform } from "@/components/site/eeg-waveform";

/**
 * Split auth layout, shared by /login and /register. The brand panel sits on the
 * deepest plane so it recedes, and the form card is lifted above it — the two
 * halves are deliberately on different planes.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <aside className="app-surface relative hidden overflow-hidden border-r border-[var(--border)] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <EegWaveform className="pointer-events-none absolute inset-x-0 top-1/2 h-56 w-full -translate-y-1/2 opacity-70" />

        <div className="relative">
          <BrandMark size="md" />
        </div>

        <p className="relative max-w-sm text-sm leading-relaxed text-[var(--muted)]">
          Practice the patterns that matter — question bank, atlas, and the
          latest literature.
        </p>
      </aside>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-10">
        {/* Mobile-only brand mark so small screens keep their identity. */}
        <div className="mb-10 lg:hidden">
          <BrandMark size="md" />
        </div>

        <div className="mx-auto w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 shadow-md">
          <div className="flex flex-col gap-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
              Pattern mastery for EEG readers
            </p>
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
