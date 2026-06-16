import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { QuestionForm } from "@/components/admin/question-form";
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
    </div>
  );
}
