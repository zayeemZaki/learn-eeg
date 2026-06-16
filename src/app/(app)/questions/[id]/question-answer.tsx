"use client";

import { useState, useTransition } from "react";
import { submitAnswer, type AnswerResult } from "@/app/actions/attempts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// The client only ever receives choice id + text. Whether a choice is correct,
// and the explanation, come back from the server *after* answering — never in
// the props below. (Mirrors the select in the detail page's loader.)
export interface ClientChoice {
  id: string;
  text: string;
}
export interface ClientQuestion {
  id: string;
  stem: string;
  imageUrl: string | null;
  choices: ClientChoice[];
}

// Tiny inline glyphs so correct/incorrect is never conveyed by color alone.
function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CrossIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Answers a single question. The user picks an option, the server (submitAnswer)
 * decides correctness and returns the explanation, and the result panel shows
 * the outcome. "Answer again" resets local state so they can pick again — each
 * submit is a fresh Attempt (the action already creates one per call), so no
 * server change is needed for retry.
 *
 * Replaces the old multi-question cycling Quiz: this component owns exactly one
 * question, and the list page links to one detail page per question instead.
 */
export function QuestionAnswer({ question }: { question: ClientQuestion }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<AnswerResult, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const answered = result !== null;

  function choose(choiceId: string) {
    if (answered) return;
    setSelected(choiceId);
    setError(null);
    startTransition(async () => {
      const res = await submitAnswer({ questionId: question.id, choiceId });
      if (res.ok) setResult(res);
      else setError(res.error);
    });
  }

  // Reset to an unanswered state so the user can choose again. The previous
  // Attempt remains recorded server-side; the next submit records another.
  function answerAgain() {
    setSelected(null);
    setResult(null);
    setError(null);
  }

  // Visual state per choice. Unanswered: neutral, accent border on hover.
  // Answered: the correct choice goes green, the picked-wrong one red, the rest
  // dim. Color is always paired with an icon+label marker (choiceMarker), so it
  // is never the sole signal.
  function choiceStyle(choiceId: string): string {
    if (!answered) {
      return "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] motion-safe:hover:-translate-y-0.5";
    }
    if (choiceId === result!.correctChoiceId) {
      return "border-green-600 bg-green-500/10 text-green-800";
    }
    if (choiceId === selected) {
      return "border-red-600 bg-red-500/10 text-red-800";
    }
    return "border-[var(--border)] opacity-60";
  }

  // The non-color status marker shown on answered choices.
  function choiceMarker(choiceId: string) {
    if (!answered) return null;
    if (choiceId === result!.correctChoiceId) {
      return (
        <span className="ml-3 inline-flex items-center gap-1 text-xs font-semibold text-green-700">
          <CheckIcon />
          Correct
        </span>
      );
    }
    if (choiceId === selected) {
      return (
        <span className="ml-3 inline-flex items-center gap-1 text-xs font-semibold text-red-700">
          <CrossIcon />
          Your answer
        </span>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        {question.choices.map((choice) => {
          const isSelected = choice.id === selected;
          return (
            <button
              key={choice.id}
              type="button"
              disabled={answered || isPending}
              aria-pressed={isSelected}
              onClick={() => choose(choice.id)}
              className={`flex items-center justify-between rounded-xl border px-4 py-4 text-left text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-default ${choiceStyle(choice.id)}`}
            >
              <span>{choice.text}</span>
              {choiceMarker(choice.id)}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="inline-flex items-center gap-2 text-sm font-medium text-red-700">
          <CrossIcon />
          {error}
        </p>
      ) : null}

      {answered ? (
        <Card
          className={
            result!.isCorrect
              ? "border-green-600/40 bg-green-500/5"
              : "border-red-600/40 bg-red-500/5"
          }
        >
          <p
            className={`inline-flex items-center gap-2 font-semibold ${
              result!.isCorrect ? "text-green-700" : "text-red-700"
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
          <Button className="mt-4" variant="ghost" onClick={answerAgain}>
            Answer again
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
