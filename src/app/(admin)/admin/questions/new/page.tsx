import Link from "next/link";

import { QuestionForm } from "@/components/admin/question-form";

export const metadata = { title: "New question" };

/** Create page: renders the shared QuestionForm in create mode. */
export default function NewQuestionPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/questions"
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-[var(--muted)] outline-none transition hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to questions
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          New question
        </h1>
      </div>

      <QuestionForm />
    </div>
  );
}
