import { type ReactNode } from "react";
import Link from "next/link";

/**
 * A single column definition. `header` is the column label; `cell` renders the
 * value for one row; `align` controls horizontal alignment (numbers right-align,
 * the image marker centres); `className` is applied to the body `<td>` (e.g.
 * `max-w-md` to clamp a wide description). `headerSrOnly` keeps the column label
 * for assistive tech while hiding it visually (the thumbnail column).
 */
export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  headerSrOnly?: boolean;
}

interface DataTableProps<T> {
  /** Column definitions, in display order. */
  columns: Column<T>[];
  /** The rows to render. */
  rows: T[];
  /** Stable key for each row. */
  rowKey: (row: T) => string;
  /**
   * Mobile (`< sm`) renderer: one card per row. The desktop table is hidden
   * below `sm` and this stacked layout shown instead, so narrow viewports never
   * have to scroll a wide table. Required because the per-list card layouts
   * differ (a question card vs. a user card), while the table is uniform.
   */
  renderCard: (row: T) => ReactNode;
  /**
   * When provided, the WHOLE row is a link to this href: the row shows a hover
   * affordance (cursor + subtle bg), is keyboard-focusable, and Enter activates
   * it. Implemented with a stretched overlay link in the first cell (valid table
   * markup — no <a> wrapping <td>s); any interactive control in a cell that must
   * sit above it (e.g. a Delete button) should set `relative z-10` and stop
   * click propagation so a row-click never triggers it.
   */
  rowHref?: (row: T) => string;
  /** Accessible label for the stretched row link (e.g. `Edit ${row.name}`). */
  rowLabel?: (row: T) => string;
  /** Minimum table width before the bordered surface scrolls horizontally. */
  minWidthClass?: string;
}

const alignClass: Record<NonNullable<Column<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

/**
 * The shared admin list surface — one responsive table primitive replacing the
 * three near-identical hand-rolled tables (questions, atlas, users). Stacked
 * cards below `sm`; from `sm` up, a horizontally-scrollable table inside a
 * bordered --surface panel, with the exact hairline header / row treatment the
 * originals used. Columns and the mobile card are passed in per list, so each
 * list declares its data, not its markup.
 *
 * Pure presentation: callers still do their own queries and pass already-shaped
 * rows, so no data or guard behaviour moves here.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  renderCard,
  rowHref,
  rowLabel,
  minWidthClass = "min-w-[44rem]",
}: DataTableProps<T>) {
  return (
    <>
      {/* Mobile: one card per row. */}
      <ul className="flex flex-col gap-3 sm:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)}>{renderCard(row)}</li>
        ))}
      </ul>

      {/* sm+: a table, horizontally scrollable inside its bordered surface so
          narrow viewports scroll rather than overflow the page. */}
      <div className="hidden overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] sm:block">
        <table className={`w-full ${minWidthClass} text-left text-sm`}>
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--muted)]">
              {columns.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  className={`px-4 py-3 font-medium ${alignClass[col.align ?? "left"]}`}
                >
                  {col.headerSrOnly ? <span className="sr-only">{col.header}</span> : col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = rowHref?.(row);
              return (
                <tr
                  key={rowKey(row)}
                  className={`border-b border-[var(--border)] last:border-0 ${
                    href
                      ? // Whole-row link: the <tr> is the positioning context for
                        // the stretched overlay link, with a subtle hover/focus
                        // fill and a focus ring driven by the overlay's focus.
                        "relative transition-colors hover:bg-[var(--background)] focus-within:bg-[var(--background)] has-[a:focus-visible]:outline has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-[var(--accent)]"
                      : ""
                  }`}
                >
                  {columns.map((col, i) => (
                    <td
                      key={i}
                      className={`px-4 py-3 ${alignClass[col.align ?? "left"]} ${col.className ?? ""}`}
                    >
                      {/* Stretched overlay link, anchored to the relative <tr> so
                          it covers the WHOLE row (not just this cell). Makes the
                          row clickable + keyboard-focusable (Enter activates) while
                          keeping valid table markup — no <a> wrapping <td>s. Lives
                          in the first cell only so it's emitted once per row. */}
                      {href && i === 0 ? (
                        <Link href={href} aria-label={rowLabel?.(row)} className="absolute inset-0 outline-none">
                          <span className="sr-only">{rowLabel?.(row)}</span>
                        </Link>
                      ) : null}
                      {/* Cell content is left unpositioned so the absolute overlay
                          link paints above it and the whole row stays clickable.
                          Interactive controls in a cell (e.g. a Delete button) must
                          lift themselves above the overlay with `relative z-10` and
                          stop click propagation — see the admin Questions/Atlas
                          Actions cells. */}
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
