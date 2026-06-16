import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { AtlasForm } from "@/components/admin/atlas-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Edit atlas entry" };

/**
 * Edit page. Fetches the entry's scalar fields and renders the shared AtlasForm
 * in edit mode (it pre-fills, shows the current image, and calls
 * updateAtlasEntry). In Next 15+/16 params is async and must be awaited.
 */
export default async function EditAtlasEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const entry = await db.atlasEntry.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      imageUrl: true,
    },
  });
  if (!entry) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Edit atlas entry"
        back={{ href: "/admin/atlas", label: "Back to atlas" }}
      />
      <AtlasForm entry={entry} />
    </div>
  );
}
