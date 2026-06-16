import { type ReactNode } from "react";

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
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-[var(--border)] last:border-0">
                {columns.map((col, i) => (
                  <td
                    key={i}
                    className={`px-4 py-3 ${alignClass[col.align ?? "left"]} ${col.className ?? ""}`}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
