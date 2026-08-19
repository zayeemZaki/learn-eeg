/** Mirrors the article reader — hero, figure, prose — while its data streams in. */
export default function Loading() {
  return (
    <>
      <p role="status" className="sr-only">Loading…</p>
      <div aria-hidden="true" className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="eeg-image-frame h-5 w-40 rounded-sm" />
        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] px-6 py-8 sm:px-10 sm:py-10">
            <div className="eeg-image-frame h-5 w-28 rounded-full" />
            <div className="eeg-image-frame h-9 w-4/5 rounded-sm" />
          </div>
          <div className="eeg-image-frame aspect-[16/9] w-full" />
          <div className="flex flex-col gap-3 px-6 py-8 sm:px-10 sm:py-10">
            <div className="eeg-image-frame h-4 w-full rounded-sm" />
            <div className="eeg-image-frame h-4 w-full rounded-sm" />
            <div className="eeg-image-frame h-4 w-2/3 rounded-sm" />
          </div>
        </div>
      </div>
    </>
  );
}
