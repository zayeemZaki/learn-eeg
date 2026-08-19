function QuestionRowSkeleton() {
  return (
    <li className="flex items-start justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="eeg-image-frame h-5 w-11/12 rounded-sm" />
        <div className="eeg-image-frame h-4 w-1/3 rounded-sm" />
      </div>
      <div className="eeg-image-frame h-4 w-20 rounded-sm" />
    </li>
  );
}

/** Mirrors the question-bank header, tabs, progress, and three compact rows. */
export default function Loading() {
  return (
    <>
      <p role="status" className="sr-only">Loading…</p>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="eeg-image-frame h-8 w-56 rounded-sm" />
          <div className="eeg-image-frame h-5 w-80 max-w-full rounded-sm" />
        </div>
        <div className="flex gap-2">
          <div className="eeg-image-frame h-9 w-20 rounded-md" />
          <div className="eeg-image-frame h-9 w-28 rounded-md" />
          <div className="eeg-image-frame h-9 w-32 rounded-md" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="eeg-image-frame h-2 w-full rounded-full" />
          <div className="eeg-image-frame h-4 w-28 rounded-sm" />
        </div>
        <ul className="flex flex-col gap-3">
          <QuestionRowSkeleton />
          <QuestionRowSkeleton />
          <QuestionRowSkeleton />
        </ul>
      </div>
    </>
  );
}
