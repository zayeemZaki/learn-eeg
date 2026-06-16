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
    // Empty string from an untouched form normalizes to null (no image).
    imageUrl: z
      .union([z.string().url(), z.literal(""), z.null()])
      .transform((v) => (v ? v : null)),
    difficulty: z.coerce
      .number()
      .int()
      .min(MIN_DIFFICULTY)
      .max(MAX_DIFFICULTY)
      .default(MIN_DIFFICULTY),
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
