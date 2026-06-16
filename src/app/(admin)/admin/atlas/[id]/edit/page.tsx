import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { AtlasForm } from "@/components/admin/atlas-form";

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
      <div>
        <Link
          href="/admin/atlas"
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-[var(--muted)] outline-none transition hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to atlas
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          Edit atlas entry
        </h1>
      </div>

      <AtlasForm entry={entry} />
    </div>
  );
}
