import { notFound } from "next/navigation";
import { AtlasCategory } from "@prisma/client";

import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { EegImage } from "@/components/ui/eeg-image";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";

// Public URL slugs map to enum values; unknown slugs 404. This ordered list is
// the single source of truth for both the routing and the tab bar below.
const CATEGORY_TABS: { slug: string; category: AtlasCategory; title: string }[] = [
  { slug: "normal", category: AtlasCategory.NORMAL_VARIANT, title: "Normal Variants" },
  { slug: "abnormal", category: AtlasCategory.ABNORMAL_VARIANT, title: "Abnormal Variants" },
];

// In Next 15+/16, dynamic params are async and must be awaited.
export default async function AtlasCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const current = CATEGORY_TABS.find((t) => t.slug === slug);
  if (!current) notFound();

  const entries = await db.atlasEntry.findMany({
    where: { category: current.category },
    orderBy: { title: "asc" },
  });

  const tabs = CATEGORY_TABS.map((t) => ({
    // Short tab labels; the active tab also titles the section below.
    label: t.title.replace(" Variants", ""),
    href: `/atlas/${t.slug}`,
    active: t.slug === current.slug,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
        EEG Atlas
      </h1>

      <SegmentedTabs tabs={tabs} />

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--muted)]">
          No entries in {current.title.toLowerCase()} yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {entries.map((entry) => (
            <Card key={entry.id} className="flex h-full flex-col">
              {/* Same framed image treatment as the question bank (EegImage). */}
              <EegImage src={entry.imageUrl} alt={entry.title} />
              <h2 className="mt-3 font-[family-name:var(--font-display)] font-bold tracking-tight">
                {entry.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{entry.description}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
