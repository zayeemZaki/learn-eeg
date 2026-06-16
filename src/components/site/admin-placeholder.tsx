/**
 * Placeholder for an admin section that ships in a later phase (currently just
 * Atlas). Keeps the nav complete and dead-link-free while making the
 * not-yet-built state explicit, and is a single place to remove when its real
 * page lands.
 */
export function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
        {title}
      </h1>
      <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--muted)]">
        Coming in the next phase.
      </p>
    </div>
  );
}
