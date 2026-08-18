"use client";

import { useRef, useState, useTransition } from "react";
import { submitAnswer, type AnswerResult } from "@/app/actions/attempts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, CrossIcon } from "@/components/ui/icons";

// The client only ever receives choice id + text for an UNANSWERED question.
// Whether a choice is correct, and the explanation, come back from the server
// either in `priorAnswer` (already answered, loaded server-side) or from
// submitAnswer's response (answering now) — never as a raw field on `choices`.
export interface ClientChoice {
  id: string;
  text: string;
}
/** A client-safe image — url + alt only (no DB id, no position needed here). */
export interface ClientImage {
  url: string;
  alt: string | null;
}
/** The result of a prior Attempt, loaded server-side for an already-answered question. */
export interface PriorAnswer {
  selectedChoiceId: string;
  isCorrect: boolean;
  correctChoiceId: string;
  explanation: string;
}
export interface ClientQuestion {
  id: string;
  /** Stable, system-assigned ordinal shown as "Question #N". Just an ordinal. */
  number: number;
  stem: string;
  choices: ClientChoice[];
  images: ClientImage[];
  /** Non-null when this user already has a recorded Attempt for this question. */
  priorAnswer: PriorAnswer | null;
}

// Positional option letters (a, b, c, …) by render order. These are purely
// presentational labels derived from position — never stored, and unrelated to
// which choice is correct. Index beyond 'z' is not expected (questions have a
// handful of choices) but falls back gracefully to a number.
function optionLetter(index: number): string {
  return index < 26 ? String.fromCharCode(97 + index) : String(index + 1);
}

/**
 * Answers a single question with a single-attempt commit:
 *
 *  1. SELECT — clicking (or keyboard-selecting) a choice only highlights it.
 *     No server call, nothing revealed. The choice group is a radiogroup:
 *     arrow keys move the selection, Space/Enter confirm focus selection.
 *  2. SUBMIT — the "Submit answer" button (enabled once a choice is selected)
 *     calls submitAnswer; the server decides correctness (and rejects a
 *     second Attempt for this question) and returns the explanation, which
 *     the result panel reveals. Focus moves to that panel.
 *
 * A question can be answered ONCE. If `question.priorAnswer` is present (this
 * user already has a recorded Attempt, loaded server-side), the result view
 * renders immediately and the answer form never shows — there is no "try
 * again" path.
 *
 * The selected choice id is sent only on Submit. Color is never the sole
 * correctness signal — it is always paired with an icon+label marker.
 *
 * The answered group is marked `aria-disabled`, NOT `disabled`: it must stay
 * focusable and arrow-navigable so a keyboard or screen-reader user can review
 * which option they picked and which was correct. Interaction is blocked in the
 * handlers instead of by the DOM.
 */
export function QuestionAnswer({ question }: { question: ClientQuestion }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<AnswerResult, { ok: true }> | null>(
    question.priorAnswer
      ? {
          ok: true,
          isCorrect: question.priorAnswer.isCorrect,
          correctChoiceId: question.priorAnswer.correctChoiceId,
          explanation: question.priorAnswer.explanation,
        }
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Refs to the radio buttons (for roving-tabindex keyboard navigation) and to
  // the result region (focus moves there after a submit reveals the outcome).
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const answered = result !== null;
  // The choice the user actually picked — from this session's submit, or (on a
  // fresh load of an already-answered question) from the loaded prior Attempt.
  const pickedChoiceId = selected ?? question.priorAnswer?.selectedChoiceId ?? null;

  // SELECT only — non-destructive, no server call, nothing revealed.
  function select(choiceId: string) {
    if (answered) return;
    setSelected(choiceId);
    setError(null);
  }

  // SUBMIT — commit the selected choice. Server decides correctness (and
  // rejects if this question was already answered); on success the result
  // panel renders and we move focus to it.
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

  // Radiogroup keyboard model: arrows move the selection (and focus) with wrap,
  // Space/Enter selects the focused option. Roving tabindex (below) keeps a
  // single tab stop for the whole group.
  //
  // Once answered, arrows still MOVE FOCUS so the reviewed answer can be read
  // option by option — they just no longer change the selection (select() is a
  // no-op then). Only Space/Enter is inert.
  function onKeyDown(e: React.KeyboardEvent, index: number) {
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
        if (!answered) select(question.choices[index].id);
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
    if (choiceId === pickedChoiceId) {
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
    if (choiceId === pickedChoiceId) {
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
          const isSelected = choice.id === (answered ? pickedChoiceId : selected);
          const letter = optionLetter(index);
          // Roving tabindex: exactly one option is in the tab order — the
          // selected one, or the first option when nothing is selected yet.
          // Exactly one option is in the tab order: the selected/picked one, or
          // the first option when nothing is picked yet. Holds after answering
          // too, so Tab lands on the answer the user gave.
          const isTabStop =
            isSelected || (pickedChoiceId === null && selected === null && index === 0);
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
              // The answered group stays REACHABLE: aria-disabled (not the
              // `disabled` attribute) marks it read-only, because a disabled
              // button is removed from the tab order and skipped by screen-reader
              // navigation — which would make the reviewed answer, the one thing
              // this screen exists to show, unreadable by keyboard. Clicks are
              // already inert via select()/submit()'s own answered guards.
              aria-disabled={answered || isPending}
              tabIndex={isTabStop ? 0 : -1}
              disabled={isPending && !answered}
              onClick={() => select(choice.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={`flex items-center justify-between rounded-xl border px-4 py-4 text-left text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] aria-disabled:cursor-default disabled:cursor-default ${choiceStyle(choice.id)}`}
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
          </Card>
        </div>
      ) : null}
    </div>
  );
}
