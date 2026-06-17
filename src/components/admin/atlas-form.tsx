"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AtlasCategory } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { SectionPanel } from "@/components/ui/section-panel";
import { EegImageUpload } from "@/components/admin/eeg-image-upload";
import {
  createAtlasEntry,
  updateAtlasEntry,
} from "@/app/actions/admin-atlas";
import { type ActionResult } from "@/app/actions/admin-questions";
import {
  atlasEntrySchema,
  ATLAS_CATEGORY_LABELS,
  type AtlasEntryInput,
} from "@/lib/validations/atlas";

interface AtlasFormProps {
  /** Edit mode when present; the form pre-fills and calls updateAtlasEntry. */
  entry?: {
    id: string;
    title: string;
    category: AtlasCategory;
    description: string;
    imageUrl: string;
  };
}

// Render order for the category select; the two enum values with human labels.
const CATEGORY_OPTIONS = [
  AtlasCategory.NORMAL_VARIANT,
  AtlasCategory.ABNORMAL_VARIANT,
] as const;

/**
 * The single create/edit form for atlas entries — one form for both modes,
 * modelled on QuestionForm. A title input, a category select (the two enum
 * values with human labels), a description textarea, and the REUSED
 * <EegImageUpload> for the EEG image (required for an atlas entry, unlike a
 * question). Submits via useTransition with inline errors from the action;
 * the action redirects to the list on success.
 *
 * Validation parity: a client-side parse with the shared schema gives instant
 * feedback (including the "image required" rule), and the server action
 * re-validates with the same schema regardless.
 */
export function AtlasForm({ entry }: AtlasFormProps) {
  const isEdit = Boolean(entry);

  const [title, setTitle] = useState(entry?.title ?? "");
  const [category, setCategory] = useState<AtlasCategory>(
    entry?.category ?? AtlasCategory.NORMAL_VARIANT,
  );
  const [description, setDescription] = useState(entry?.description ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(entry?.imageUrl ?? null);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit() {
    setError(null);

    const payload = {
      title,
      category,
      description,
      // null when no image yet; the schema rejects it so the user is told.
      imageUrl: imageUrl ?? "",
    };

    // Client-side parse for instant feedback; the action re-validates regardless.
    const parsed = atlasEntrySchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    const data: AtlasEntryInput = parsed.data;

    startTransition(async () => {
      const result: ActionResult = isEdit
        ? await updateAtlasEntry(entry!.id, data)
        : await createAtlasEntry(data);
      // On success the action redirects, so we only get here on failure.
      if (!result.ok) setError(result.error);
    });
  }

  return (
    // Grouped to mirror QuestionForm: a Details section (title + category side
    // by side, then description) and a secondary, compact Image section. Both
    // forms reuse the same Field/SectionPanel/EegImageUpload components (DRY).
    <form action={onSubmit} className="flex flex-col gap-6">
      <SectionPanel title="Details">
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Title" htmlFor="title">
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass()}
                placeholder="e.g. Wicket spikes"
              />
            </Field>

            <Field label="Category" htmlFor="category">
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as AtlasCategory)}
                className={inputClass()}
              >
                {CATEGORY_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {ATLAS_CATEGORY_LABELS[value]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Description" htmlFor="description">
            <textarea
              id="description"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass("resize-y")}
              placeholder="What the pattern looks like and how to recognise it."
            />
          </Field>
        </div>
      </SectionPanel>

      <SectionPanel title="Image">
        {/* Reused unchanged from the question form. The image is required for an
            atlas entry; the shared schema enforces that on submit. */}
        <EegImageUpload value={imageUrl} onChange={setImageUrl} />
      </SectionPanel>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Create entry"}
        </Button>
        <Link
          href="/admin/atlas"
          className="rounded-md px-1 py-1 text-sm text-[var(--muted)] outline-none transition hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
