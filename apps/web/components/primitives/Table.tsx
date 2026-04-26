"use client";

import { useMemo, useState, type ReactNode, type UIEvent } from "react";

type SortDirection = "asc" | "desc";
type SortablePrimitive = string | number | null | undefined;

type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  sortKey?: keyof T | ((row: T) => SortablePrimitive);
  align?: "left" | "right";
  render?: (row: T) => ReactNode;
};

type TableProps<T extends Record<string, unknown>> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  virtualized?: boolean;
  viewportHeight?: number;
  rowHeight?: number;
};

type SortState = { key: string; direction: SortDirection };

function getSortValue<T extends Record<string, unknown>>(
  row: T,
  column: Column<T>,
): SortablePrimitive {
  if (typeof column.sortKey === "function") return column.sortKey(row);
  if (column.sortKey) return row[column.sortKey] as SortablePrimitive;
  return row[column.key as keyof T] as SortablePrimitive;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  onRowClick,
  virtualized = false,
  viewportHeight = 520,
  rowHeight = 40,
}: TableProps<T>) {
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const sortedRows = useMemo(() => {
    if (!sortState) return rows;
    const column = columns.find((c) => c.key === sortState.key);
    if (!column) return rows;

    return [...rows].sort((a, b) => {
      const aValue = getSortValue(a, column);
      const bValue = getSortValue(b, column);

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortState.direction === "asc" ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue ?? "");
      const bStr = String(bValue ?? "");
      return sortState.direction === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [columns, rows, sortState]);

  const toggleSort = (key: string) => {
    setSortState((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
    });
  };

  const shouldVirtualize = virtualized && sortedRows.length > 120;
  const overscan = 8;
  const visibleCount = Math.ceil(viewportHeight / rowHeight);
  const startIndex = shouldVirtualize
    ? Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
    : 0;
  const endIndex = shouldVirtualize
    ? Math.min(sortedRows.length, startIndex + visibleCount + overscan * 2)
    : sortedRows.length;
  const visibleRows = shouldVirtualize ? sortedRows.slice(startIndex, endIndex) : sortedRows;
  const paddingTop = shouldVirtualize ? startIndex * rowHeight : 0;
  const paddingBottom = shouldVirtualize
    ? Math.max(0, (sortedRows.length - endIndex) * rowHeight)
    : 0;

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!shouldVirtualize) return;
    setScrollTop(event.currentTarget.scrollTop);
  };

  return (
    <div
      className={`overflow-x-auto rounded-lg border border-slate-800 ${shouldVirtualize ? "overflow-y-auto" : ""}`}
      style={shouldVirtualize ? { maxHeight: `${viewportHeight}px` } : undefined}
      onScroll={handleScroll}
    >
      <table className="min-w-full text-sm">
        <thead className="bg-slate-900">
          <tr>
            {columns.map((column) => {
              const isActive = sortState?.key === column.key;
              const chevron = !column.sortable
                ? ""
                : isActive && sortState?.direction === "desc"
                  ? "▾"
                  : "▴";

              return (
                <th key={column.key} className="border-b border-slate-800 px-3 py-2 text-left">
                  <button
                    type="button"
                    className={`flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-slate-400 ${column.sortable ? "cursor-pointer hover:text-slate-200" : "cursor-default"}`}
                    onClick={() => column.sortable && toggleSort(column.key)}
                  >
                    {column.header}
                    {column.sortable ? (
                      <span className="text-xs text-slate-500">{chevron}</span>
                    ) : null}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {shouldVirtualize && paddingTop > 0 ? (
            <tr aria-hidden="true">
              <td colSpan={columns.length} style={{ height: `${paddingTop}px`, padding: 0 }} />
            </tr>
          ) : null}

          {visibleRows.map((row, index) => {
            const absoluteIndex = shouldVirtualize ? startIndex + index : index;
            return (
              <tr
                key={rowKey(row, absoluteIndex)}
                className={`border-b border-slate-800/70 hover:bg-slate-800/60 ${onRowClick ? "cursor-pointer" : ""}`}
                style={{
                  backgroundColor: absoluteIndex % 2 === 0 ? "#121820" : "#151d27",
                  height: `${rowHeight}px`,
                }}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-3 py-2 text-slate-200 ${column.align === "right" ? "text-right" : "text-left"}`}
                  >
                    {column.render ? column.render(row) : String(row[column.key as keyof T] ?? "")}
                  </td>
                ))}
              </tr>
            );
          })}

          {shouldVirtualize && paddingBottom > 0 ? (
            <tr aria-hidden="true">
              <td colSpan={columns.length} style={{ height: `${paddingBottom}px`, padding: 0 }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
