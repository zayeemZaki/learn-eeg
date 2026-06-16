import Link from "next/link";
import { AtlasCategory } from "@prisma/client";

import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EegImage } from "@/components/ui/eeg-image";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { DeleteAtlasButton } from "@/components/admin/delete-atlas-button";
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

/** Accent pill carrying the human category label — never colour-only. */
function CategoryBadge({ category }: { category: AtlasCategory }) {
  return (
    <span className="inline-flex whitespace-nowrap rounded-full border border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-2 py-0.5 text-xs font-semibold tracking-wide text-[var(--accent)]">
      {ATLAS_CATEGORY_LABELS[category]}
    </span>
  );
}

/**
 * Admin atlas list: every entry with a thumbnail (the shared EEG frame), title,
 * category badge, and a description preview, plus per-row Edit/Delete and a
 * "New entry" button. A SegmentedTabs strip filters by category (All | Normal |
 * Abnormal) via the URL.
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
            Atlas
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            {total} {total === 1 ? "entry" : "entries"}.
          </p>
        </div>
        <Link href="/admin/atlas/new">
          <Button>New entry</Button>
        </Link>
      </div>

      <SegmentedTabs tabs={tabs} />

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--muted)]">
          {filter === "all"
            ? "No atlas entries yet. Create the first one."
            : "No entries in this category yet."}
        </p>
      ) : (
        <>
          {/* Mobile: one card per entry. */}
          <ul className="flex flex-col gap-3 sm:hidden">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Card className="flex flex-col gap-3">
                  <EegImage src={entry.imageUrl} alt={entry.title} />
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-medium text-[var(--foreground)]">
                      {entry.title}
                    </p>
                    <CategoryBadge category={entry.category} />
                  </div>
                  <p className="line-clamp-3 text-sm text-[var(--muted)]">
                    {entry.description}
                  </p>
                  <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                    <Link href={`/admin/atlas/${entry.id}/edit`}>
                      <Button variant="ghost">Edit</Button>
                    </Link>
                    <DeleteAtlasButton id={entry.id} />
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          {/* sm+: a table, horizontally scrollable inside its bordered surface. */}
          <div className="hidden overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] sm:block">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                  <th scope="col" className="px-4 py-3 font-medium">Image</th>
                  <th scope="col" className="px-4 py-3 font-medium">Title</th>
                  <th scope="col" className="px-4 py-3 font-medium">Category</th>
                  <th scope="col" className="px-4 py-3 font-medium">Description</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3">
                      {/* Compact thumbnail through the shared frame — no layout
                          shift, alt-texted with the title. */}
                      <div className="w-28">
                        <EegImage src={entry.imageUrl} alt={entry.title} />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      {entry.title}
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={entry.category} />
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <span className="line-clamp-2 text-[var(--muted)]">
                        {entry.description}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/atlas/${entry.id}/edit`}>
                          <Button variant="ghost">Edit</Button>
                        </Link>
                        <DeleteAtlasButton id={entry.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
