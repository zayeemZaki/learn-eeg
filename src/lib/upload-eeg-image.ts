/**
 * The single client-side EEG-image upload helper, shared by the single-image
 * picker (EegImageUpload, used by the atlas + question forms) and the multi-image
 * gallery picker (EegImageGalleryUpload). Both stream files DIRECTLY to Vercel
 * Blob via the admin token route (/api/admin/upload) — never through a serverless
 * function — so the same validated flow, content-type/size guard, and
 * addRandomSuffix behaviour can't drift between the two callers.
 *
 * Type and size are checked here for instant feedback; the token route
 * re-enforces both server-side, so this is convenience, not security.
 */
import { upload } from "@vercel/blob/client";

import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/validations/question";

const MAX_MB = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));

/** Comma-joined accept attribute for the file <input>. */
export const ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

/** Human-readable constraint hint shown beside the picker controls. */
export const UPLOAD_HINT = `PNG, JPEG, or WebP · up to ${MAX_MB} MB.`;

/** Thrown for a client-side validation failure (type/size); message is shown as-is. */
export class UploadValidationError extends Error {}

/**
 * Validate one file against the allowed types and max size. Throws an
 * UploadValidationError with a user-facing message on failure.
 */
export function validateImageFile(file: File): void {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new UploadValidationError("Use a PNG, JPEG, or WebP image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new UploadValidationError(`Image must be ${MAX_MB} MB or smaller.`);
  }
}

/**
 * Upload a single (already-validated) file to Blob via the admin token route and
 * return its public URL. `onProgress` receives 0–100. Maps the token route's
 * "Unauthorized" into a readable message; rethrows everything else.
 */
export async function uploadImageFile(
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  try {
    const result = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/admin/upload",
      contentType: file.type,
      onUploadProgress: ({ percentage }) => onProgress?.(percentage),
    });
    return result.url;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    throw new Error(
      message === "Unauthorized"
        ? "You don't have permission to upload images."
        : message,
    );
  }
}
