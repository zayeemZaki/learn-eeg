"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

import { EegImage } from "@/components/ui/eeg-image";
import { Button } from "@/components/ui/button";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
} from "@/lib/validations/question";

interface EegImageUploadProps {
  /** Current image URL (when editing) or null. Controlled by the parent. */
  value: string | null;
  /** Called with the new Blob URL after upload, or null after remove. */
  onChange: (url: string | null) => void;
  /** Accessible label / id base so multiple instances don't collide. */
  id?: string;
}

const ACCEPT = ALLOWED_IMAGE_TYPES.join(",");
const MAX_MB = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));

/**
 * EEG image picker that uploads directly from the browser to Vercel Blob via the
 * admin token route (/api/admin/upload), bypassing the serverless body-size
 * limit. Its only output is the resulting Blob URL, lifted to the parent via
 * onChange — so it's a drop-in for any form needing one EEG image (the atlas
 * form reuses it unchanged).
 *
 * Presentation is a compact thumbnail control, not a giant drop-zone: the empty
 * state is a single "Upload image" button with the size/type hint beside it;
 * once set, a small (~112px) thumbnail preview reveals Replace/Remove on
 * hover/focus; while uploading, progress is a compact inline label on the
 * button/thumbnail. All upload logic is unchanged — only the chrome around it.
 *
 * Type and size are validated here for instant feedback; the token route
 * re-enforces both server-side, so this check is convenience, not security.
 */
export function EegImageUpload({ value, onChange, id = "eeg-image" }: EegImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploading = progress !== null;

  async function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset the input so selecting the same file again still fires onChange.
    event.target.value = "";
    if (!file) return;

    setError(null);

    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setError("Use a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Image must be ${MAX_MB} MB or smaller.`);
      return;
    }

    setProgress(0);
    try {
      const result = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/admin/upload",
        contentType: file.type,
        onUploadProgress: ({ percentage }) => setProgress(percentage),
      });
      onChange(result.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      // The token route returns "Unauthorized" for non-admins; make it readable.
      setError(
        message === "Unauthorized"
          ? "You don't have permission to upload images."
          : message,
      );
    } finally {
      setProgress(null);
    }
  }

  const openPicker = () => inputRef.current?.click();
  const hint = `PNG, JPEG, or WebP · up to ${MAX_MB} MB.`;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[var(--muted)]">EEG image (optional)</span>

      {/* The file input is always mounted but visually hidden; the controls
          below drive it. Reset-on-select and disabled-while-uploading behaviour
          is unchanged from before. */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPT}
        onChange={onFileSelected}
        disabled={uploading}
        className="sr-only"
      />

      {value ? (
        // Set state: a small thumbnail with Replace/Remove revealed on hover or
        // keyboard focus (the overlay is also shown whenever a control inside it
        // is focused, so it's reachable without a mouse).
        <div className="flex items-start gap-3">
          <div className="group relative w-28 shrink-0">
            <EegImage src={value} alt="Selected EEG image preview" />

            {/* Hover/focus overlay with the two actions. Hidden by default, shown
                on hover and whenever it contains focus; motion-safe fade. */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--foreground)_55%,transparent)] opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 motion-reduce:transition-none">
              <OverlayButton onClick={openPicker} disabled={uploading} label="Replace" />
              <OverlayButton onClick={() => onChange(null)} disabled={uploading} label="Remove" />
            </div>

            {/* Uploading: a compact label over the thumbnail, not a full-width bar. */}
            {uploading ? (
              <div
                className="absolute inset-0 flex items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--foreground)_55%,transparent)] text-xs font-medium text-white"
                role="progressbar"
                aria-label="Upload progress"
                aria-valuenow={progress ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {progress ?? 0}%
              </div>
            ) : null}
          </div>

          <p className="text-xs text-[var(--muted)]">{hint}</p>
        </div>
      ) : (
        // Empty state: a single compact button — no large drop-zone — with the
        // size/type hint as small helper text beside it.
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Button type="button" variant="ghost" disabled={uploading} onClick={openPicker}>
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
            ) : (
              "Upload image"
            )}
          </Button>
          <p className="text-xs text-[var(--muted)]">{hint}</p>
        </div>
      )}

      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

/** A small overlay action over the thumbnail (Replace / Remove). Presentational. */
function OverlayButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md bg-[color-mix(in_srgb,var(--surface)_95%,transparent)] px-2 py-1 text-xs font-medium text-[var(--foreground)] outline-none transition hover:bg-[var(--surface)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
    >
      {label}
    </button>
  );
}
