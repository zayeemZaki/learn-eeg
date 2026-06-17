import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { QuestionForm } from "@/components/admin/question-form";
import { DeleteQuestionButton } from "@/components/admin/delete-question-button";
import { PageHeader } from "@/components/ui/page-header";

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
      category: true,
      choices: {
        select: { id: true, text: true, isCorrect: true },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!question) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Edit question"
        back={{ href: "/admin/questions", label: "Back to questions" }}
      />
      <QuestionForm question={question} />

      {/* Danger zone — the delete control lives on the edit page (not the list);
          the trash button opens a confirm modal and, on success, returns to the
          list. The deleteQuestion action itself is unchanged. */}
      <section
        aria-label="Danger zone"
        className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_25%,var(--border))] bg-danger-soft p-4"
      >
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Danger zone</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Deleting a question also removes its choices and any attempt history. This
          can&apos;t be undone.
        </p>
        <div className="mt-3">
          <DeleteQuestionButton id={question.id} />
        </div>
      </section>
    </div>
  );
}
