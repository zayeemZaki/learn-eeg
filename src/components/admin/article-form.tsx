"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { SectionPanel } from "@/components/ui/section-panel";
import { EegImageUpload } from "@/components/admin/eeg-image-upload";
import { createArticle, updateArticle } from "@/app/actions/admin-articles";
import { type ActionResult } from "@/app/actions/admin-questions";
import { articleSchema, type ArticleInput } from "@/lib/validations/article";

interface ArticleFormProps {
  /** Edit mode when present; the form pre-fills and calls updateArticle. */
  article?: {
    id: string;
    title: string;
    summary: string;
    url: string | null;
    source: string | null;
    publishedAt: string | null;
    imageUrl: string | null;
  };
}

/**
 * The single create/edit form for literature articles — one form for both modes,
 * modelled on AtlasForm. A title input, a summary textarea, optional link/source/
 * date inputs, and the REUSED <EegImageUpload> for an optional figure. Submits via
 * useTransition with inline errors from the action; the action redirects to the
 * list on success.
 *
 * Validation parity: a client-side parse with the shared schema gives instant
 * feedback, and the server action re-validates with the same schema regardless.
 */
export function ArticleForm({ article }: ArticleFormProps) {
  const isEdit = Boolean(article);

  const [title, setTitle] = useState(article?.title ?? "");
  const [summary, setSummary] = useState(article?.summary ?? "");
  const [url, setUrl] = useState(article?.url ?? "");
  const [source, setSource] = useState(article?.source ?? "");
  const [publishedAt, setPublishedAt] = useState(article?.publishedAt ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(article?.imageUrl ?? null);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit() {
    setError(null);

    const payload = {
      title,
      summary,
      // Empty strings normalise to undefined in the schema → stored as null.
      url,
      source,
      publishedAt,
      imageUrl: imageUrl ?? "",
    };

    // Client-side parse for instant feedback; the action re-validates regardless.
    const parsed = articleSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    const data: ArticleInput = parsed.data;

    startTransition(async () => {
      const result: ActionResult = isEdit
        ? await updateArticle(article!.id, data)
        : await createArticle(data);
      // On success the action redirects, so we only get here on failure.
      if (!result.ok) setError(result.error);
    });
  }

  return (
    // Grouped to mirror AtlasForm: a Details section, then a compact Image section.
    <form action={onSubmit} className="flex flex-col gap-6">
      <SectionPanel title="Details">
        <div className="flex flex-col gap-5">
          <Field label="Title" htmlFor="title">
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass()}
              placeholder="e.g. Continuous EEG in critically ill patients"
            />
          </Field>

          <Field label="Summary" htmlFor="summary">
            <textarea
              id="summary"
              required
              rows={5}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className={inputClass("resize-y")}
              placeholder="The teaching point or abstract students should take away."
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Source (optional)" htmlFor="source">
              <input
                id="source"
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className={inputClass()}
                placeholder="e.g. Epilepsia"
              />
            </Field>

            <Field label="Published (optional)" htmlFor="publishedAt">
              <input
                id="publishedAt"
                type="text"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className={inputClass()}
                placeholder="e.g. 2024 Mar"
              />
            </Field>
          </div>

          <Field label="External link (optional)" htmlFor="url">
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputClass()}
              placeholder="https://pubmed.ncbi.nlm.nih.gov/…"
            />
          </Field>
        </div>
      </SectionPanel>

      <SectionPanel title="Figure">
        {/* Reused unchanged from the question/atlas forms; the figure is optional. */}
        <EegImageUpload value={imageUrl} onChange={setImageUrl} id="article-image" />
      </SectionPanel>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Create article"}
        </Button>
        <Link
          href="/admin/articles"
          className="rounded-md px-1 py-1 text-sm text-[var(--muted)] outline-none transition hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
