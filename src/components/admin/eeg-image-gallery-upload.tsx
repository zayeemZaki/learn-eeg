"use client";

import { useId, useRef, useState } from "react";

import { EegImage } from "@/components/ui/eeg-image";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon } from "@/components/ui/icons";
import {
  ACCEPT,
  UPLOAD_HINT,
  UploadValidationError,
  uploadImageFile,
  validateImageFile,
} from "@/lib/upload-eeg-image";
import { MAX_IMAGES } from "@/lib/validations/question";

/** One image in the ordered gallery. The array order is the gallery order. */
export interface GalleryImage {
  url: string;
  alt: string;
}

interface EegImageGalleryUploadProps {
  /** Current ordered images (controlled by the parent form). */
  value: GalleryImage[];
  /** Called with the next ordered list after any add/remove/reorder/alt edit. */
  onChange: (images: GalleryImage[]) => void;
}

/**
 * Multi-image EEG picker. Sibling of the single EegImageUpload (which is left
 * untouched for the atlas form): it reuses the SAME validated per-file upload
 * helper (uploadImageFile → /api/admin/upload token flow, content-type + size
 * limits, addRandomSuffix), looping it over each selected file so multiple can be
 * picked at once.
 *
 * State is an ORDERED list of { url, alt }. Each uploaded image is a compact
 * thumbnail (the same EegImage frame used everywhere) with a per-image alt input
 * (accessibility), Remove, and up/down reordering. The "add images" affordance is
 * disabled once MAX_IMAGES is reached. Removal here is local-only — it just drops
 * the URL from the list; the Blob object is cleaned up server-side by the update
 * action's reconcile when the form is saved (no immediate delete).
 */
export function EegImageGalleryUpload({ value, onChange }: EegImageGalleryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  // Upload progress 0–100 while a batch is in flight, else null.
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploading = progress !== null;
  const atCap = value.length >= MAX_IMAGES;
  const remaining = MAX_IMAGES - value.length;

  async function onFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // Reset the input so selecting the same file(s) again still fires onChange.
    event.target.value = "";
    if (files.length === 0) return;

    setError(null);

    // Respect the cap: only take as many as fit; tell the user if we trimmed.
    const accepted = files.slice(0, remaining);
    if (files.length > remaining) {
      setError(`You can add up to ${MAX_IMAGES} images; extra files were skipped.`);
    }

    // Validate all up front so a bad file fails fast before any upload starts.
    try {
      accepted.forEach(validateImageFile);
    } catch (err) {
      if (err instanceof UploadValidationError) {
        setError(err.message);
        return;
      }
      throw err;
    }

    setProgress(0);
    // Upload sequentially (one token round-trip per file). Accumulate locally so
    // a mid-batch failure still keeps the images that already succeeded.
    const added: GalleryImage[] = [];
    try {
      for (let i = 0; i < accepted.length; i += 1) {
        const file = accepted[i]!;
        const url = await uploadImageFile(file, (pct) => {
          // Blend per-file progress into an overall batch percentage.
          setProgress(Math.round(((i + pct / 100) / accepted.length) * 100));
        });
        added.push({ url, alt: "" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      if (added.length > 0) onChange([...value, ...added]);
      setProgress(null);
    }
  }

  function setAlt(index: number, alt: string) {
    onChange(value.map((img, i) => (i === index ? { ...img, alt } : img)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  // Swap with the neighbour to move an image one slot up/down (stable order).
  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  const openPicker = () => inputRef.current?.click();

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-[var(--muted)]">
        EEG images (optional) · up to {MAX_IMAGES}
      </span>

      <input
        ref={inputRef}
        id={`${baseId}-input`}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={onFilesSelected}
        disabled={uploading}
        className="sr-only"
      />

      {value.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((img, index) => {
            const altId = `${baseId}-alt-${index}`;
            return (
              <li
                key={`${img.url}-${index}`}
                className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2"
              >
                <EegImage src={img.url} alt={img.alt || `EEG image ${index + 1} preview`} />

                {/* Per-image alt text — required for an accessible gallery/lightbox. */}
                <label htmlFor={altId} className="sr-only">
                  Alt text for image {index + 1}
                </label>
                <input
                  id={altId}
                  type="text"
                  value={img.alt}
                  onChange={(e) => setAlt(index, e.target.value)}
                  placeholder="Describe this image"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                />

                {/* Reorder + remove. Order is conveyed by position AND the "n of N"
                    label, never colour. Up/down disabled at the ends. */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                    {index + 1} of {value.length}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <IconButton
                      onClick={() => move(index, -1)}
                      disabled={uploading || index === 0}
                      label={`Move image ${index + 1} earlier`}
                    >
                      <ChevronLeftIcon className="h-4 w-4 rotate-90" />
                    </IconButton>
                    <IconButton
                      onClick={() => move(index, 1)}
                      disabled={uploading || index === value.length - 1}
                      label={`Move image ${index + 1} later`}
                    >
                      <ChevronLeftIcon className="h-4 w-4 -rotate-90" />
                    </IconButton>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => remove(index)}
                      disabled={uploading}
                      aria-label={`Remove image ${index + 1}`}
                      className="px-2 py-1 text-xs"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Button
          type="button"
          variant="ghost"
          disabled={uploading || atCap}
          onClick={openPicker}
        >
          {uploading ? (
            <span
              role="progressbar"
              aria-label="Upload progress"
              aria-valuenow={progress ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              Uploading… {progress ?? 0}%
            </span>
          ) : value.length > 0 ? (
            "Add more images"
          ) : (
            "Add images"
          )}
        </Button>
        <p className="text-xs text-[var(--muted)]">
          {atCap ? `Maximum of ${MAX_IMAGES} images reached.` : UPLOAD_HINT}
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A small square icon-only control (reorder). Presentational. */
function IconButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-md p-1 text-[var(--muted)] outline-none transition hover:bg-[var(--background)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
