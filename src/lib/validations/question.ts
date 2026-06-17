/**
 * Question/choice validation — the single source of truth shared by the admin
 * QuestionForm (client) and the admin server actions, so the rules can never
 * drift between the two. The server actions re-parse with these schemas; never
 * trust the client.
 *
 * The image-upload constraints (allowed types, max size) live here too so the
 * upload token route, the upload component, and any future reuse all agree.
 */
import { z } from "zod";
import { QuestionCategory } from "@prisma/client";

/**
 * Human labels for the QuestionCategory enum (UI + display). Mirrors the
 * ATLAS_CATEGORY_LABELS / POSITION_LABELS style so the form select, dashboards,
 * and any badge render the same text — category is therefore always conveyed by
 * label, never colour alone.
 */
export const QUESTION_CATEGORY_LABELS: Record<QuestionCategory, string> = {
  [QuestionCategory.NORMAL_VARIANT]: "Normal variant",
  [QuestionCategory.EPILEPTIFORM]: "Epileptiform",
  [QuestionCategory.SEIZURE]: "Seizure",
  [QuestionCategory.ARTIFACT]: "Artifact",
  [QuestionCategory.ENCEPHALOPATHY]: "Encephalopathy",
  [QuestionCategory.FOCAL]: "Focal abnormality",
  [QuestionCategory.OTHER]: "Other / uncategorized",
};

/** Content types the EEG image uploader and token route accept. */
export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

/** Max upload size, in bytes (8 MB). Enforced client-side and on the token. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Difficulty bounds (1 = easy … 3 = hard); mirrors the schema default of 1. */
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 3;

/**
 * Max EEG images per question. A sane ceiling so the gallery/lightbox and the
 * action payload stay bounded; enforced in BOTH the form (disable "add" at the
 * cap) and the schema (server re-check) so the two can never drift — mirrors the
 * choices.min(2) discipline below.
 */
export const MAX_IMAGES = 8;

/**
 * One attached EEG image. `url` reuses the same url-or-empty rule as the legacy
 * single imageUrl (empty strings are dropped before this runs — see the array
 * transform on `images`). `alt` is the per-image description for screen readers
 * (gallery + lightbox); optional and trimmed, empty normalises to null.
 */
const questionImageSchema = z.object({
  url: z.string().url("Each image needs a valid URL"),
  alt: z
    .union([z.string().trim().max(300), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
});

/** A single answer option. `isCorrect` is authored admin-side only. */
const choiceSchema = z.object({
  // Optional id: present for existing choices on edit, absent for new ones.
  id: z.string().min(1).optional(),
  text: z.string().trim().min(1, "Option text is required").max(500),
  isCorrect: z.boolean(),
});

export const questionSchema = z
  .object({
    stem: z.string().trim().min(1, "Stem is required").max(2000),
    explanation: z.string().trim().min(1, "Explanation is required").max(4000),
    // DEPRECATED single-image field. Kept for back-compat (the column still
    // exists); the form no longer sends it — multi-image authoring goes through
    // `images` below. Empty string from an untouched form normalizes to null.
    imageUrl: z
      .union([z.string().url(), z.literal(""), z.null()])
      .transform((v) => (v ? v : null))
      .optional(),
    // Ordered EEG images (one-to-many). The array order IS the gallery order;
    // the action persists each item's index as QuestionImage.position. Capped at
    // MAX_IMAGES so the form and the server agree on the same bound. Defaults to
    // an empty array so a question with no images is valid.
    images: z
      .array(questionImageSchema)
      .max(MAX_IMAGES, `Add at most ${MAX_IMAGES} images`)
      .default([]),
    difficulty: z.coerce
      .number()
      .int()
      .min(MIN_DIFFICULTY)
      .max(MAX_DIFFICULTY)
      .default(MIN_DIFFICULTY),
    // Native enum: only the seven QuestionCategory values are accepted. Required
    // (no UI path leaves it unset — the form defaults the select to OTHER).
    category: z.nativeEnum(QuestionCategory, {
      errorMap: () => ({ message: "Choose a category" }),
    }),
    choices: z.array(choiceSchema).min(2, "Add at least two options"),
  })
  // Exactly one option may be marked correct — enforced here so both the form
  // and every server action share the rule. The error is attached to `choices`
  // so the form can surface it near the choices editor.
  .refine((q) => q.choices.filter((c) => c.isCorrect).length === 1, {
    message: "Mark exactly one option as correct",
    path: ["choices"],
  });

export type QuestionInput = z.infer<typeof questionSchema>;
export type ChoiceInput = z.infer<typeof choiceSchema>;
export type QuestionImageInput = z.infer<typeof questionImageSchema>;
