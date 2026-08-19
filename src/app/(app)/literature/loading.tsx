function LiteratureCardSkeleton() {
  return (
    <li className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xs">
      <div className="eeg-image-frame aspect-[16/9] w-full" />
      <div className="flex flex-col gap-2 p-5">
        <div className="eeg-image-frame h-3 w-24 rounded-sm" />
        <div className="eeg-image-frame h-5 w-3/4 rounded-sm" />
        <div className="eeg-image-frame h-4 w-full rounded-sm" />
        <div className="eeg-image-frame h-4 w-2/3 rounded-sm" />
        <div className="eeg-image-frame mt-2 h-4 w-28 rounded-sm" />
      </div>
    </li>
  );
}

/** Mirrors the literature card grid while its page data streams in. */
export default function Loading() {
  return (
    <>
      <p role="status" className="sr-only">Loading…</p>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="eeg-image-frame h-8 w-60 rounded-sm" />
          <div className="eeg-image-frame h-5 w-96 max-w-full rounded-sm" />
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <LiteratureCardSkeleton />
          <LiteratureCardSkeleton />
          <LiteratureCardSkeleton />
        </ul>
      </div>
    </>
  );
}
