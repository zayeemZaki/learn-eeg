import { ArticleForm } from "@/components/admin/article-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "New article" };

/** Create page: renders the shared ArticleForm in create mode. */
export default function NewArticlePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New article"
        back={{ href: "/admin/articles", label: "Back to literature" }}
      />
      <ArticleForm />
    </div>
  );
}
