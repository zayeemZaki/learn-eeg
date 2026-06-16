import Link from "next/link";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { SectionPanel } from "@/components/ui/section-panel";
import { POSITION_LABELS } from "@/lib/validations/auth";
import { QuestionsIcon, AtlasIcon, LiteratureIcon } from "@/components/shell/nav-icons";

// The "jump back in" sections, rendered as a tight nav list (not big filler
// cards). Deep analytics arrive in M3; this stays a clean wayfinding treatment.
const SECTIONS = [
  { href: "/questions", title: "Question Bank", body: "Test your interpretation against teaching cases.", icon: <QuestionsIcon /> },
  { href: "/atlas", title: "Atlas", body: "Reference normal and abnormal variants.", icon: <AtlasIcon /> },
  { href: "/literature", title: "Literature", body: "Recent epilepsy/EEG publications from PubMed.", icon: <LiteratureIcon /> },
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
      <PageHeader
        title={`Welcome, ${session!.user.name}`}
        description={`${POSITION_LABELS[session!.user.position]} · ${session!.user.institution}`}
      />

      {/* Progress as stat tiles in the new shell. The accuracy tile carries the
          one thin accent bar, shown only once there's an attempt to measure. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile
          label="Questions answered"
          value={total.toLocaleString()}
          sub={total === 0 ? "Answer your first question to start tracking." : undefined}
        />
        <StatTile
          label="Accuracy"
          value={accuracy !== null ? `${accuracy}%` : "—"}
          sub={
            accuracy !== null
              ? `${correct.toLocaleString()} of ${total.toLocaleString()} correct`
              : "No attempts yet"
          }
        >
          {accuracy !== null ? (
            <div
              className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]"
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
        </StatTile>
      </div>

      {/* Jump back in: a tight, aligned section list — no giant filler cards. */}
      <SectionPanel title="Jump back in">
        <ul className="-m-2 flex flex-col">
          {SECTIONS.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="group flex items-center gap-4 rounded-lg p-2 outline-none transition hover:bg-[var(--background)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted)] transition group-hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] group-hover:text-[var(--accent)]">
                  {section.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-[var(--foreground)]">
                    {section.title}
                  </span>
                  <span className="block truncate text-sm text-[var(--muted)]">
                    {section.body}
                  </span>
                </span>
                <svg
                  viewBox="0 0 16 16"
                  className="h-4 w-4 shrink-0 text-[var(--muted)] transition-transform motion-safe:group-hover:translate-x-0.5"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </SectionPanel>
    </div>
  );
}
