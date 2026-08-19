function PanelSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs ${className}`}>
      <div className="eeg-image-frame h-4 w-28 rounded-sm" />
      <div className="eeg-image-frame mt-4 h-9 w-20 rounded-sm" />
      <div className="eeg-image-frame mt-3 h-4 w-2/3 rounded-sm" />
    </div>
  );
}

/** Mirrors the dashboard headline, stat tiles, and first chart row. */
export default function Loading() {
  return (
    <>
      <p role="status" className="sr-only">Loading…</p>
      <div aria-hidden="true" className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="eeg-image-frame h-8 w-72 max-w-full rounded-sm" />
          <div className="eeg-image-frame h-5 w-96 max-w-full rounded-sm" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PanelSkeleton />
          <PanelSkeleton />
          <PanelSkeleton />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <PanelSkeleton className="min-h-56 lg:col-span-1" />
          <PanelSkeleton className="min-h-56 lg:col-span-2" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <PanelSkeleton className="min-h-48" />
          <PanelSkeleton className="min-h-48" />
        </div>
      </div>
    </>
  );
}
