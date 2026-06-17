import Link from "next/link";
import { AtlasCategory } from "@prisma/client";

import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EegImage } from "@/components/ui/eeg-image";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { ATLAS_CATEGORY_LABELS } from "@/lib/validations/atlas";

export const metadata = { title: "Atlas" };

// Category filter is driven entirely by the URL (?category=normal|abnormal) so
// each view is shareable and server-rendered — the same pattern the public
// atlas tabs and the question-bank status filter use. Anything else falls back
// to "all". This ordered list is the single source of truth for both the filter
// and the tab bar.
type CategoryFilter = "all" | "normal" | "abnormal";

const CATEGORY_TABS: { slug: Exclude<CategoryFilter, "all">; category: AtlasCategory }[] = [
  { slug: "normal", category: AtlasCategory.NORMAL_VARIANT },
  { slug: "abnormal", category: AtlasCategory.ABNORMAL_VARIANT },
];

function parseCategory(raw: string | string[] | undefined): CategoryFilter {
  if (raw === "normal" || raw === "abnormal") return raw;
  return "all";
}

interface AtlasRow {
  id: string;
  title: string;
  category: AtlasCategory;
  description: string;
  imageUrl: string;
}

/** The accent category pill — never colour-only (carries the human label). */
function CategoryBadge({ category }: { category: AtlasCategory }) {
  return <Badge tone="accent">{ATLAS_CATEGORY_LABELS[category]}</Badge>;
}

/**
 * Admin atlas list: every entry with a thumbnail (the shared EEG frame), title,
 * category badge, and a description preview, plus a "New entry" button. The whole
 * row links to the editor; deletion now lives on that edit page (a trash-icon
 * "Danger zone"), so the list carries no per-row delete. A SegmentedTabs strip
 * filters by category (All | Normal | Abnormal) via the URL; the list renders
 * through the shared DataTable.
 *
 * One query: a single findMany, optionally narrowed by the category filter and
 * ordered by title. Counts for the tab badges come from a cheap groupBy so the
 * tabs show how many entries each category holds without a per-tab query.
 */
export default async function AdminAtlasPage({
  searchParams,
}: {
  // In Next 15+/16, searchParams is async and must be awaited.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filter = parseCategory((await searchParams).category);
  const activeCategory = CATEGORY_TABS.find((t) => t.slug === filter)?.category;

  const [entries, categoryGroups] = await Promise.all([
    db.atlasEntry.findMany({
      where: activeCategory ? { category: activeCategory } : undefined,
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        imageUrl: true,
      },
    }),
    db.atlasEntry.groupBy({ by: ["category"], _count: { _all: true } }),
  ]);

  // category -> count, for the tab badges. Absent categories read as 0.
  const countByCategory = new Map(
    categoryGroups.map((g) => [g.category, g._count._all]),
  );
  const total = categoryGroups.reduce((sum, g) => sum + g._count._all, 0);

  const tabs = [
    { label: "All", href: "/admin/atlas", active: filter === "all", count: total },
    ...CATEGORY_TABS.map((t) => ({
      label: t.slug === "normal" ? "Normal" : "Abnormal",
      href: `/admin/atlas?category=${t.slug}`,
      active: filter === t.slug,
      count: countByCategory.get(t.category) ?? 0,
    })),
  ];

  const columns: Column<AtlasRow>[] = [
    {
      header: "Image",
      headerSrOnly: true,
      cell: (entry) => (
        // Compact thumbnail through the shared frame — no layout shift,
        // alt-texted with the title.
        <div className="w-28">
          <EegImage src={entry.imageUrl} alt={entry.title} />
        </div>
      ),
    },
    {
      header: "Title",
      cell: (entry) => <span className="font-medium text-[var(--foreground)]">{entry.title}</span>,
    },
    { header: "Category", cell: (entry) => <CategoryBadge category={entry.category} /> },
    {
      header: "Description",
      className: "max-w-md",
      cell: (entry) => (
        <span className="line-clamp-2 text-[var(--muted)]">{entry.description}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Atlas"
        description={`${total} ${total === 1 ? "entry" : "entries"}.`}
        actions={
          <Link href="/admin/atlas/new">
            <Button>New entry</Button>
          </Link>
        }
      />

      <SegmentedTabs tabs={tabs} />

      {entries.length === 0 ? (
        <EmptyState
          message={
            filter === "all"
              ? "No atlas entries yet. Create the first one."
              : "No entries in this category yet."
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={entries}
          rowKey={(entry) => entry.id}
          rowHref={(entry) => `/admin/atlas/${entry.id}/edit`}
          rowLabel={(entry) => `Edit ${entry.title}`}
          renderCard={(entry) => (
            // The whole card is the tap target → edit; deletion lives on the
            // edit page, so the card carries no delete control.
            <Card>
              <Link
                href={`/admin/atlas/${entry.id}/edit`}
                aria-label={`Edit ${entry.title}`}
                className="-m-1 flex flex-col gap-3 rounded-lg p-1 outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <EegImage src={entry.imageUrl} alt={entry.title} />
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-medium text-[var(--foreground)]">{entry.title}</p>
                  <CategoryBadge category={entry.category} />
                </div>
                <p className="line-clamp-3 text-sm text-[var(--muted)]">{entry.description}</p>
              </Link>
            </Card>
          )}
        />
      )}
    </div>
  );
}
