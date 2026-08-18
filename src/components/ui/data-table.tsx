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

interface DataTableBaseProps<T> {
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
   * it. Implemented as one stretched overlay link PER CELL, each anchored to its
   * own relative <td> (valid table markup — no <a> wrapping <td>s); any
   * interactive control in a cell that must sit above it (e.g. a Delete button)
   * should set `relative z-10` and stop click propagation so a row-click never
   * triggers it.
   *
   * WHY PER-CELL, NOT ONE OVERLAY ON THE <tr>: Safari/WebKit ignores
   * `position: relative` on a <tr>, so a single `absolute inset-0` link in the
   * first cell escapes the row and stretches to the nearest positioned ancestor
   * — covering unrelated page chrome (on iPad this made the "New" button open
   * the last row's edit page). A <td> is a reliable containing block in every
   * engine, so anchoring one overlay per cell keeps the hit area inside the row.
   */
  rowHref?: (row: T) => string;
  /**
   * Accessible label for the stretched row link (e.g. `Edit ${row.name}`).
   * REQUIRED whenever `rowHref` is passed — see the RowLinkProps union below:
   * a clickable row with no name is an unlabelled link to a screen reader.
   */
  rowLabel?: (row: T) => string;
  /** Minimum table width before the bordered surface scrolls horizontally. */
  minWidthClass?: string;
}

/**
 * Row-link props travel as a PAIR: either both `rowHref` and `rowLabel`, or
 * neither. Typing it as a union (rather than two independent optional props) is
 * what makes "clickable but unnamed" unrepresentable instead of merely
 * discouraged — the a11y rule is enforced by the compiler, at every call site.
 */
type RowLinkProps<T> =
  | { rowHref: (row: T) => string; rowLabel: (row: T) => string }
  | { rowHref?: undefined; rowLabel?: undefined };

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
}: DataTableBaseProps<T> & RowLinkProps<T>) {
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
              // Narrow the href/label PAIR once here: RowLinkProps guarantees
              // they arrive together, but destructured params lose that link, so
              // this is what lets the label be used without a non-null assertion.
              const rowLink = rowHref
                ? { href: rowHref(row), label: rowLabel(row) }
                : null;
              return (
                <tr
                  key={rowKey(row)}
                  className={`border-b border-[var(--border)] last:border-0 ${
                    rowLink
                      ? // Whole-row link: a subtle hover/focus fill plus a focus
                        // ring driven by the first cell's overlay link (the
                        // overlays themselves are anchored per <td>).
                        "transition-colors hover:bg-[var(--background)] focus-within:bg-[var(--background)] has-[a:focus-visible]:outline has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-[var(--accent)]"
                      : ""
                  }`}
                >
                  {columns.map((col, i) => (
                    <td
                      key={i}
                      className={`px-4 py-3 ${alignClass[col.align ?? "left"]} ${
                        rowLink ? "relative" : ""
                      } ${col.className ?? ""}`}
                    >
                      {/* One stretched overlay link per cell, anchored to THIS
                          <td>. Together they cover the whole row, so a tap
                          anywhere in the row opens it, while the hit area can
                          never leak outside the row (see rowHref's note on
                          Safari and `position: relative` on <tr>).

                          The FIRST cell's overlay carries the row's accessible
                          name, as sr-only text rather than aria-label: one
                          naming mechanism, not two competing ones. The remaining
                          overlays are pure mouse/touch hit area — they are taken
                          out of the tab order AND hidden from the a11y tree, so
                          the row is announced exactly once instead of once per
                          column. */}
                      {rowLink ? (
                        i === 0 ? (
                          <Link
                            href={rowLink.href}
                            className="absolute inset-0 outline-none"
                          >
                            <span className="sr-only">{rowLink.label}</span>
                          </Link>
                        ) : (
                          <Link
                            href={rowLink.href}
                            aria-hidden
                            tabIndex={-1}
                            className="absolute inset-0 outline-none"
                          />
                        )
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
