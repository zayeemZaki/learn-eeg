import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { QuestionForm } from "@/components/admin/question-form";

export const metadata = { title: "Edit question" };

/**
 * Edit page. Fetches the question with its choices INCLUDING isCorrect — that is
 * correct here: this is the admin-only authoring view behind the /admin guard,
 * not the public quiz. The choices keep their ids so the form can update them in
 * place. In Next 15+/16 params is async and must be awaited.
 */
export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const question = await db.question.findUnique({
    where: { id },
    select: {
      id: true,
      stem: true,
      explanation: true,
      imageUrl: true,
      difficulty: true,
      choices: {
        select: { id: true, text: true, isCorrect: true },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!question) notFound();

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
          Edit question
        </h1>
      </div>

      <QuestionForm question={question} />
    </div>
  );
}
