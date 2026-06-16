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
 * limit. Shows the current image when editing, live progress while uploading,
 * and remove/replace controls. Its only output is the resulting Blob URL, lifted
 * to the parent via onChange — so it's a drop-in for any form needing one EEG
 * image (the Phase 3 atlas form reuses it unchanged).
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

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[var(--muted)]">EEG image (optional)</span>

      {value ? (
        <EegImage src={value} alt="Selected EEG image preview" />
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] text-sm text-[var(--muted)]">
          No image
        </div>
      )}

      {/* Live progress, announced for assistive tech. */}
      {uploading ? (
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]"
          role="progressbar"
          aria-label="Upload progress"
          aria-valuenow={progress ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width]"
            style={{ width: `${progress ?? 0}%` }}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={ACCEPT}
          onChange={onFileSelected}
          disabled={uploading}
          className="sr-only"
        />
        <Button
          type="button"
          variant="ghost"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading
            ? `Uploading… ${progress ?? 0}%`
            : value
              ? "Replace image"
              : "Upload image"}
        </Button>
        {value && !uploading ? (
          <Button type="button" variant="ghost" onClick={() => onChange(null)}>
            Remove
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-[var(--muted)]">PNG, JPEG, or WebP · up to {MAX_MB} MB.</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
