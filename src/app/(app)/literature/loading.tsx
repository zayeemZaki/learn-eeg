function LiteratureRowSkeleton() {
  return (
    <li className="flex gap-4 border-b border-[var(--border)] p-4 last:border-0">
      <div className="eeg-image-frame aspect-[16/9] w-28 shrink-0 rounded-md border border-[var(--border)]" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="eeg-image-frame h-5 w-3/4 rounded-sm" />
        <div className="eeg-image-frame h-4 w-1/4 rounded-sm" />
        <div className="eeg-image-frame h-4 w-full rounded-sm" />
        <div className="eeg-image-frame h-4 w-2/3 rounded-sm" />
        <div className="eeg-image-frame h-4 w-36 rounded-sm" />
      </div>
    </li>
  );
}

/** Mirrors the compact literature feed while its page data streams in. */
export default function Loading() {
  return (
    <>
      <p role="status" className="sr-only">Loading…</p>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="eeg-image-frame h-8 w-60 rounded-sm" />
          <div className="eeg-image-frame h-5 w-96 max-w-full rounded-sm" />
        </div>
        <ul className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <LiteratureRowSkeleton />
          <LiteratureRowSkeleton />
          <LiteratureRowSkeleton />
        </ul>
      </div>
    </>
  );
}
