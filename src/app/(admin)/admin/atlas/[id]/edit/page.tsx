import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { AtlasForm } from "@/components/admin/atlas-form";
import { DeleteAtlasButton } from "@/components/admin/delete-atlas-button";
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

      {/* Danger zone — the delete control lives on the edit page (not the list);
          the trash button opens a confirm modal and, on success, returns to the
          list. The deleteAtlasEntry action itself is unchanged. */}
      <section
        aria-label="Danger zone"
        className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_25%,var(--border))] bg-danger-soft p-4"
      >
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Danger zone</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Deleting this entry removes it from the atlas permanently. This can&apos;t be
          undone.
        </p>
        <div className="mt-3">
          <DeleteAtlasButton id={entry.id} />
        </div>
      </section>
    </div>
  );
}
