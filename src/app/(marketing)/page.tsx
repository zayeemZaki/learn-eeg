import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EegWaveform } from "@/components/site/eeg-waveform";

/** Public landing page: a single hero whose one job is sign up or log in. */
export default function WelcomePage() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Strip-chart paper: a whisper-faint ruled grid evoking paper EEG,
          sitting *behind* the waveform so the trace stays the signature. */}
      <div className="eeg-grid pointer-events-none absolute inset-0 -z-20" aria-hidden="true" />

      {/* Signature: the EEG trace runs behind the hero, vertically centered. */}
      <EegWaveform className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-64 w-full -translate-y-1/2 opacity-80" />

      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center sm:py-32">
        <span className="text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
          Pattern mastery for EEG readers
        </span>

        <h1 className="font-[family-name:var(--font-display)] text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Read EEGs with confidence.
        </h1>

        <p className="max-w-2xl text-lg text-[var(--muted)]">
          Sharpen your interpretation with a question bank, look up patterns in
          the atlas, and keep current with the latest epilepsy literature — all
          in one focused workspace.
        </p>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Link href="/register">
            <Button size="lg" className="w-full sm:w-auto">
              Get started
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="lg" className="w-full sm:w-auto">
              Log in
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
