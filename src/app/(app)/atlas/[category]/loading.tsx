function AtlasCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs">
      <div className="eeg-image-frame aspect-[16/9] w-full rounded-md border border-[var(--border)]" />
      <div className="eeg-image-frame mt-3 h-6 w-2/3 rounded-sm" />
      <div className="eeg-image-frame mt-2 h-4 w-full rounded-sm" />
      <div className="eeg-image-frame mt-2 h-4 w-4/5 rounded-sm" />
    </div>
  );
}

/** Mirrors the atlas title, category tabs, and two-card page grid. */
export default function Loading() {
  return (
    <>
      <p role="status" className="sr-only">Loading…</p>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <div className="eeg-image-frame h-8 w-36 rounded-sm" />
        <div className="flex gap-2">
          <div className="eeg-image-frame h-9 w-24 rounded-md" />
          <div className="eeg-image-frame h-9 w-28 rounded-md" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <AtlasCardSkeleton />
          <AtlasCardSkeleton />
        </div>
      </div>
    </>
  );
}
