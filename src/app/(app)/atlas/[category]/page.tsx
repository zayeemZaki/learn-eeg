import { notFound } from "next/navigation";
import { AtlasCategory } from "@prisma/client";

import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { AtlasImageLightbox } from "@/components/ui/atlas-image-lightbox";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pager } from "@/components/ui/pager";
import { CONTENT_PAGE_SIZE, pageInfo, resolvePage } from "@/lib/pagination";

// Public URL slugs map to enum values; unknown slugs 404. This ordered list is
// the single source of truth for both the routing and the tab bar below.
const CATEGORY_TABS: { slug: string; category: AtlasCategory; title: string }[] = [
  { slug: "normal", category: AtlasCategory.NORMAL_VARIANT, title: "Normal Variants" },
  { slug: "abnormal", category: AtlasCategory.ABNORMAL_VARIANT, title: "Abnormal Variants" },
];

// In Next 15+/16, dynamic params are async and must be awaited.
export default async function AtlasCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { category: slug } = await params;
  const current = CATEGORY_TABS.find((t) => t.slug === slug);
  if (!current) notFound();

  const page = resolvePage((await searchParams).page, CONTENT_PAGE_SIZE);

  const [entries, totalEntries] = await Promise.all([
    db.atlasEntry.findMany({
      where: { category: current.category },
      orderBy: { title: "asc" },
      skip: page.skip,
      take: page.take,
      // Explicit fields — the card renders exactly these.
      select: { id: true, title: true, description: true, imageUrl: true },
    }),
    db.atlasEntry.count({ where: { category: current.category } }),
  ]);

  const info = pageInfo(page, totalEntries);

  const tabs = CATEGORY_TABS.map((t) => ({
    // Short tab labels; the active tab also titles the section below.
    label: t.title.replace(" Variants", ""),
    href: `/atlas/${t.slug}`,
    active: t.slug === current.slug,
  }));

  return (
    <div className="atlas-print-page flex flex-col gap-6">
      <div className="atlas-print-header">
        <PageHeader title="EEG Atlas" />
      </div>

      <div className="atlas-print-controls">
        <SegmentedTabs tabs={tabs} />
      </div>

      {entries.length === 0 ? (
        <EmptyState message={`No entries in ${current.title.toLowerCase()} yet.`} />
      ) : (
        <div className="atlas-print-grid grid gap-4 sm:grid-cols-2">
          {entries.map((entry) => (
            <Card key={entry.id} className="atlas-print-entry flex h-full flex-col">
              <AtlasImageLightbox
                src={entry.imageUrl}
                title={entry.title}
                description={entry.description}
              />
              <h2 className="mt-3 font-[family-name:var(--font-display)] font-bold tracking-tight">
                {entry.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{entry.description}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="atlas-print-controls">
        <Pager
          info={info}
          hrefForPage={(p) => `/atlas/${current.slug}?page=${p}`}
          itemLabel="entries"
        />
      </div>
    </div>
  );
}
