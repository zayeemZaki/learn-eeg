import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { SectionCard } from "@/components/ui/section-card";
import { EegWaveform } from "@/components/site/eeg-waveform";
import { POSITION_LABELS } from "@/lib/validations/auth";

const SECTIONS = [
  { href: "/questions", title: "EEG Question Bank", body: "Test your interpretation against teaching cases." },
  { href: "/atlas", title: "EEG Atlas", body: "Reference normal and abnormal variants." },
  { href: "/literature", title: "Latest Epilepsy Literature", body: "Recent epilepsy/EEG publications from PubMed." },
];

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  // Aggregate progress in the database rather than pulling rows into the app.
  const [total, correct] = await Promise.all([
    db.attempt.count({ where: { userId } }),
    db.attempt.count({ where: { userId, isCorrect: true } }),
  ]);
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;

  return (
    <div className="flex flex-col gap-8">
      {/* Masthead: greeting over a quiet EEG trace — the site signature used
          sparingly as a single ambient accent, edge-faded by its own mask. */}
      <div className="relative isolate overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-8">
        <EegWaveform className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-28 w-full -translate-y-1/2 opacity-50" />
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          Welcome, {session!.user.name}
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          {POSITION_LABELS[session!.user.position]} · {session!.user.institution}
        </p>
      </div>

      {/* Progress: numbers as the emphasis, --muted labels. A thin accent bar
          visualizes accuracy only when there's at least one attempt. */}
      <Card>
        <p className="text-sm font-medium text-[var(--muted)]">Your progress</p>
        <div className="mt-4 flex flex-wrap gap-x-12 gap-y-4">
          <div>
            <p className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
              {total}
            </p>
            <p className="text-sm text-[var(--muted)]">
              Question{total === 1 ? "" : "s"} answered
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
              {accuracy !== null ? `${accuracy}%` : "—"}
            </p>
            <p className="text-sm text-[var(--muted)]">Accuracy</p>
          </div>
        </div>
        {accuracy !== null ? (
          <div
            className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]"
            role="progressbar"
            aria-label="Accuracy"
            aria-valuenow={accuracy}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${accuracy}%` }}
            />
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {SECTIONS.map((section) => (
          <SectionCard
            key={section.href}
            href={section.href}
            title={section.title}
            body={section.body}
          />
        ))}
      </div>
    </div>
  );
}
