/**
 * Atlas-entry validation — the single source of truth shared by the admin
 * AtlasForm (client) and the admin server actions, so the rules can never drift
 * between the two. The server actions re-parse with this schema; never trust
 * the client. Mirrors the style of question.ts.
 *
 * Unlike a question (where the image is optional), an atlas entry IS
 * fundamentally an image of an EEG pattern — the schema column `imageUrl` is
 * non-null — so the image is REQUIRED here. The image-upload constraints
 * (allowed types, max size) are shared from question.ts so the upload token
 * route, the reused uploader, and both forms all agree.
 */
import { z } from "zod";
import { AtlasCategory } from "@prisma/client";

/**
 * Human labels for the two atlas categories, keyed by the Prisma enum value.
 * Shared so the form select, any badge, and future reuse render the same text;
 * category is therefore always conveyed by label, never colour alone.
 */
export const ATLAS_CATEGORY_LABELS: Record<AtlasCategory, string> = {
  [AtlasCategory.NORMAL_VARIANT]: "Normal variant",
  [AtlasCategory.ABNORMAL_VARIANT]: "Abnormal variant",
};

export const atlasEntrySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  // Native enum: only the two AtlasCategory values are accepted.
  category: z.nativeEnum(AtlasCategory, {
    errorMap: () => ({ message: "Choose a category" }),
  }),
  description: z.string().trim().min(1, "Description is required").max(4000),
  // Required, and must be a valid URL — an atlas entry without its EEG image is
  // not a meaningful entry (the column is non-null).
  imageUrl: z.string().url("Add an EEG image"),
});

export type AtlasEntryInput = z.infer<typeof atlasEntrySchema>;
