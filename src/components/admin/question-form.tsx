"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { SectionPanel } from "@/components/ui/section-panel";
import { EegImageUpload } from "@/components/admin/eeg-image-upload";
import {
  createQuestion,
  updateQuestion,
  type ActionResult,
} from "@/app/actions/admin-questions";
import {
  questionSchema,
  MIN_DIFFICULTY,
  MAX_DIFFICULTY,
  QUESTION_CATEGORY_LABELS,
  type QuestionInput,
} from "@/lib/validations/question";
import { QuestionCategory } from "@prisma/client";

/** A choice row in the editor. `key` is a stable client id for React lists; an
 *  existing choice also carries its persisted `id` so updates target it. */
interface ChoiceRow {
  key: string;
  id?: string;
  text: string;
  isCorrect: boolean;
}

interface QuestionFormProps {
  /** Edit mode when present; the form pre-fills and calls updateQuestion. */
  question?: {
    id: string;
    stem: string;
    explanation: string;
    imageUrl: string | null;
    difficulty: number;
    category: QuestionCategory;
    choices: { id: string; text: string; isCorrect: boolean }[];
  };
}

// Monotonic client-only id source for new choice rows (no Date/random needed).
let rowSeq = 0;
function newRow(): ChoiceRow {
  rowSeq += 1;
  return { key: `new-${rowSeq}`, text: "", isCorrect: false };
}

const DIFFICULTY_LABELS: Record<number, string> = { 1: "Easy", 2: "Medium", 3: "Hard" };

/**
 * The single create/edit form for questions. Stem + explanation textareas, the
 * reusable EEG image uploader, a difficulty select, and a dynamic choices editor
 * where each row has a text input and a "correct" radio — the radio group makes
 * exactly-one-correct the only reachable UI state; the shared zod schema
 * re-enforces it server-side. Submits via useTransition with inline errors from
 * the action; the action redirects to the list on success.
 */
export function QuestionForm({ question }: QuestionFormProps) {
  const isEdit = Boolean(question);
  const correctRadioName = useId();

  const [stem, setStem] = useState(question?.stem ?? "");
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(question?.imageUrl ?? null);
  const [difficulty, setDifficulty] = useState(question?.difficulty ?? MIN_DIFFICULTY);
  const [category, setCategory] = useState<QuestionCategory>(
    question?.category ?? QuestionCategory.OTHER,
  );
  const [choices, setChoices] = useState<ChoiceRow[]>(
    question
      ? question.choices.map((c) => ({ key: c.id, id: c.id, text: c.text, isCorrect: c.isCorrect }))
      : [newRow(), newRow()],
  );

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setChoiceText(key: string, text: string) {
    setChoices((rows) => rows.map((r) => (r.key === key ? { ...r, text } : r)));
  }
  function setCorrect(key: string) {
    // Radio semantics: exactly one row correct at a time.
    setChoices((rows) => rows.map((r) => ({ ...r, isCorrect: r.key === key })));
  }
  function addChoice() {
    setChoices((rows) => [...rows, newRow()]);
  }
  function removeChoice(key: string) {
    setChoices((rows) => rows.filter((r) => r.key !== key));
  }

  function onSubmit() {
    setError(null);

    const payload: QuestionInput = {
      stem,
      explanation,
      imageUrl,
      difficulty,
      category,
      choices: choices.map((c) => ({ id: c.id, text: c.text, isCorrect: c.isCorrect })),
    };

    // Client-side parse for instant feedback; the action re-validates regardless.
    const parsed = questionSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }

    startTransition(async () => {
      const result: ActionResult = isEdit
        ? await updateQuestion(question!.id, parsed.data)
        : await createQuestion(parsed.data);
      // On success the action redirects, so we only get here on failure.
      if (!result.ok) setError(result.error);
    });
  }

  return (
    // Grouped sections instead of one long stack of equal full-width fields:
    // Content (the teaching text), the compact Image control (secondary), the
    // Answer options block, and Meta (difficulty + category, side by side).
    <form action={onSubmit} className="flex flex-col gap-6">
      <SectionPanel title="Content">
        <div className="flex flex-col gap-5">
          <Field label="Stem" htmlFor="stem">
            <textarea
              id="stem"
              required
              rows={3}
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              className={inputClass("resize-y")}
              placeholder="The clinical prompt shown to the user."
            />
          </Field>

          <Field label="Explanation" htmlFor="explanation">
            <textarea
              id="explanation"
              required
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className={inputClass("resize-y")}
              placeholder="The teaching point shown after answering."
            />
          </Field>
        </div>
      </SectionPanel>

      <SectionPanel title="Image">
        <EegImageUpload value={imageUrl} onChange={setImageUrl} />
      </SectionPanel>

      <SectionPanel title="Answer options" aside="Select the one correct answer">
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Options — select the one correct answer</legend>

          {choices.map((choice, index) => (
            <div key={choice.key} className="flex items-center gap-3">
              {/* Radio enforces exactly-one-correct in the UI; label text makes the
                  state non-color-only and gives the radio a large hit target. */}
              <label className="inline-flex shrink-0 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={correctRadioName}
                  checked={choice.isCorrect}
                  onChange={() => setCorrect(choice.key)}
                  className="h-4 w-4 accent-[var(--accent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                  aria-label={`Mark option ${index + 1} as correct`}
                />
                <span className="text-[var(--muted)]">Correct</span>
              </label>

              <input
                type="text"
                value={choice.text}
                onChange={(e) => setChoiceText(choice.key, e.target.value)}
                className={inputClass()}
                placeholder={`Option ${index + 1}`}
                aria-label={`Option ${index + 1} text`}
              />

              {/* Removing is always allowed in the UI down to 2 rows; the server
                  rejects removing an option that has already been answered. */}
              {choices.length > 2 ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeChoice(choice.key)}
                  aria-label={`Remove option ${index + 1}`}
                  className="shrink-0"
                >
                  Remove
                </Button>
              ) : null}
            </div>
          ))}

          <div>
            <Button type="button" variant="ghost" onClick={addChoice}>
              Add option
            </Button>
          </div>
        </fieldset>
      </SectionPanel>

      <SectionPanel title="Meta">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Difficulty" htmlFor="difficulty">
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className={inputClass()}
            >
              {Array.from(
                { length: MAX_DIFFICULTY - MIN_DIFFICULTY + 1 },
                (_, i) => MIN_DIFFICULTY + i,
              ).map((level) => (
                <option key={level} value={level}>
                  {level} — {DIFFICULTY_LABELS[level]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Category" htmlFor="category">
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as QuestionCategory)}
              className={inputClass()}
            >
              {Object.values(QuestionCategory).map((value) => (
                <option key={value} value={value}>
                  {QUESTION_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </SectionPanel>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Create question"}
        </Button>
        <Link
          href="/admin/questions"
          className="rounded-md px-1 py-1 text-sm text-[var(--muted)] outline-none transition hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
