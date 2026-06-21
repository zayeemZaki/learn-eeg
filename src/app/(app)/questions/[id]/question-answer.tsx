"use client";

import { useRef, useState, useTransition } from "react";
import { submitAnswer, type AnswerResult } from "@/app/actions/attempts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, CrossIcon } from "@/components/ui/icons";

// The client only ever receives choice id + text. Whether a choice is correct,
// and the explanation, come back from the server *after* answering — never in
// the props below. (Mirrors the select in the detail page's loader.)
export interface ClientChoice {
  id: string;
  text: string;
}
/** A client-safe image — url + alt only (no DB id, no position needed here). */
export interface ClientImage {
  url: string;
  alt: string | null;
}
export interface ClientQuestion {
  id: string;
  /** Stable, system-assigned ordinal shown as "Question #N". Just an ordinal. */
  number: number;
  stem: string;
  choices: ClientChoice[];
  images: ClientImage[];
}

// Positional option letters (a, b, c, …) by render order. These are purely
// presentational labels derived from position — never stored, and unrelated to
// which choice is correct. Index beyond 'z' is not expected (questions have a
// handful of choices) but falls back gracefully to a number.
function optionLetter(index: number): string {
  return index < 26 ? String.fromCharCode(97 + index) : String(index + 1);
}

/**
 * Answers a single question with a two-step commit:
 *
 *  1. SELECT — clicking (or keyboard-selecting) a choice only highlights it.
 *     No server call, nothing revealed. The choice group is a radiogroup:
 *     arrow keys move the selection, Space/Enter confirm focus selection.
 *  2. SUBMIT — the "Submit answer" button (enabled once a choice is selected)
 *     calls submitAnswer (server logic unchanged); the server decides
 *     correctness and returns the explanation, which the result panel reveals.
 *     Focus moves to that panel.
 *  3. TRY AGAIN — resets to the SELECT state (clears selection + result) so the
 *     user can pick again and resubmit. Each submit records a fresh Attempt (the
 *     action already creates one per call); retries stay allowed — no server
 *     change, no unique constraint.
 *
 * The selected choice id is sent only on Submit. Color is never the sole
 * correctness signal — it is always paired with an icon+label marker.
 */
export function QuestionAnswer({ question }: { question: ClientQuestion }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<AnswerResult, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Refs to the radio buttons (for roving-tabindex keyboard navigation) and to
  // the result region (focus moves there after a submit reveals the outcome).
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const answered = result !== null;

  // SELECT only — non-destructive, no server call, nothing revealed.
  function select(choiceId: string) {
    if (answered) return;
    setSelected(choiceId);
    setError(null);
  }

  // SUBMIT — commit the selected choice. Server decides correctness; on success
  // the result panel renders and we move focus to it.
  function submit() {
    if (answered || isPending || !selected) return;
    const choiceId = selected;
    startTransition(async () => {
      const res = await submitAnswer({ questionId: question.id, choiceId });
      if (res.ok) {
        setResult(res);
        // Defer to after the result region paints, then focus it.
        requestAnimationFrame(() => resultRef.current?.focus());
      } else {
        setError(res.error);
      }
    });
  }

  // TRY AGAIN — reset to the SELECT state so the user can pick again. The prior
  // Attempt stays recorded server-side; the next submit records another.
  function tryAgain() {
    setSelected(null);
    setResult(null);
    setError(null);
    // Return focus to the choice group for keyboard users.
    requestAnimationFrame(() => optionRefs.current[0]?.focus());
  }

  // Radiogroup keyboard model: arrows move the selection (and focus) with wrap,
  // Space/Enter selects the focused option. Roving tabindex (below) keeps a
  // single tab stop for the whole group.
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (answered) return;
    const count = question.choices.length;
    let next = index;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        next = (index + 1) % count;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        next = (index - 1 + count) % count;
        break;
      case " ":
      case "Enter":
        e.preventDefault();
        select(question.choices[index].id);
        return;
      default:
        return;
    }
    e.preventDefault();
    select(question.choices[next].id);
    optionRefs.current[next]?.focus();
  }

  // Visual state per choice. Unanswered: neutral, accent border on hover, and an
  // accent ring on the selected option. Answered: the correct choice takes the
  // success tone, the picked-wrong one the danger tone, the rest dim. Color is
  // always paired with the letter badge and (when answered) an icon+label marker,
  // so it is never the sole signal.
  function choiceStyle(choiceId: string): string {
    if (!answered) {
      const base =
        "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] motion-safe:hover:-translate-y-0.5";
      return choiceId === selected
        ? "border-[var(--accent)] bg-[var(--surface)] ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)]"
        : base;
    }
    if (choiceId === result!.correctChoiceId) {
      return "border-success bg-success-soft text-success";
    }
    if (choiceId === selected) {
      return "border-danger bg-danger-soft text-danger";
    }
    return "border-[var(--border)] opacity-60";
  }

  // The non-color status marker shown on answered choices.
  function choiceMarker(choiceId: string) {
    if (!answered) return null;
    if (choiceId === result!.correctChoiceId) {
      return (
        <Badge variant="subtle" tone="positive" icon={<CheckIcon />} className="ml-3">
          Correct
        </Badge>
      );
    }
    if (choiceId === selected) {
      return (
        <Badge variant="subtle" tone="negative" icon={<CrossIcon />} className="ml-3">
          Your answer
        </Badge>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        role="radiogroup"
        aria-label="Answer choices"
        className="flex flex-col gap-3"
      >
        {question.choices.map((choice, index) => {
          const isSelected = choice.id === selected;
          const letter = optionLetter(index);
          // Roving tabindex: exactly one option is in the tab order — the
          // selected one, or the first option when nothing is selected yet.
          const isTabStop = isSelected || (selected === null && index === 0);
          return (
            <button
              key={choice.id}
              ref={(el) => {
                optionRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              // Screen readers announce "a, [choice text]" via this label.
              aria-label={`${letter}, ${choice.text}`}
              tabIndex={answered ? -1 : isTabStop ? 0 : -1}
              disabled={answered || isPending}
              onClick={() => select(choice.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={`flex items-center justify-between rounded-xl border px-4 py-4 text-left text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-default ${choiceStyle(choice.id)}`}
            >
              <span className="flex min-w-0 items-center gap-3">
                {/* Letter badge — positional label, decorative for SR (the letter
                    is already in the button's aria-label). */}
                <span
                  aria-hidden="true"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--background)] text-xs font-semibold uppercase text-[var(--muted)]"
                >
                  {letter}
                </span>
                <span>{choice.text}</span>
              </span>
              {choiceMarker(choice.id)}
            </button>
          );
        })}
      </div>

      {/* Two-step commit: Submit is enabled once a choice is selected and the
          result isn't yet shown. */}
      {!answered ? (
        <div>
          <Button onClick={submit} disabled={!selected || isPending}>
            {isPending ? "Submitting…" : "Submit answer"}
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="inline-flex items-center gap-2 text-sm font-medium text-danger">
          <CrossIcon />
          {error}
        </p>
      ) : null}

      {answered ? (
        // Focusable result region — focus lands here after Submit so keyboard and
        // screen-reader users are taken straight to the outcome.
        <div
          ref={resultRef}
          tabIndex={-1}
          aria-live="polite"
          className="outline-none"
        >
          <Card
            className={
              result!.isCorrect
                ? "border-success/40 bg-success-soft"
                : "border-danger/40 bg-danger-soft"
            }
          >
            <p
              className={`inline-flex items-center gap-2 font-semibold ${
                result!.isCorrect ? "text-success" : "text-danger"
              }`}
            >
              {result!.isCorrect ? <CheckIcon /> : <CrossIcon />}
              {result!.isCorrect ? "Correct" : "Incorrect"}
            </p>
            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Explanation
              </p>
              <p className="mt-1 text-sm text-[var(--foreground)]">{result!.explanation}</p>
            </div>
            <Button className="mt-4" variant="ghost" onClick={tryAgain}>
              Try again
            </Button>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
