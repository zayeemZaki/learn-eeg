import { QuestionForm } from "@/components/admin/question-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "New question" };

/** Create page: renders the shared QuestionForm in create mode. */
export default function NewQuestionPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New question"
        back={{ href: "/admin/questions", label: "Back to questions" }}
      />
      <QuestionForm />
    </div>
  );
}
