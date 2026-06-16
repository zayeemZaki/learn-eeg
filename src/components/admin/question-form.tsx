"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
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
  type QuestionInput,
} from "@/lib/validations/question";

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
    <form action={onSubmit} className="flex flex-col gap-6">
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

      <EegImageUpload value={imageUrl} onChange={setImageUrl} />

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

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-[var(--muted)]">
          Options — select the one correct answer
        </legend>

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

      {error ? (
        <p role="alert" className="text-sm text-red-600">
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
