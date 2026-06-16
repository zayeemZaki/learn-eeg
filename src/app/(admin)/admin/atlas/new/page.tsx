import { AtlasForm } from "@/components/admin/atlas-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "New atlas entry" };

/** Create page: renders the shared AtlasForm in create mode. */
export default function NewAtlasEntryPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New atlas entry"
        back={{ href: "/admin/atlas", label: "Back to atlas" }}
      />
      <AtlasForm />
    </div>
  );
}
