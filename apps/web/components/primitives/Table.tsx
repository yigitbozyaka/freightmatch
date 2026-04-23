'use client';

import { useMemo, useState, type ReactNode } from 'react';

type SortDirection = 'asc' | 'desc';
type SortablePrimitive = string | number | null | undefined;

type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  sortKey?: keyof T | ((row: T) => SortablePrimitive);
  align?: 'left' | 'right';
  render?: (row: T) => ReactNode;
};

type TableProps<T extends Record<string, unknown>> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
};

type SortState = { key: string; direction: SortDirection };

function getSortValue<T extends Record<string, unknown>>(row: T, column: Column<T>): SortablePrimitive {
  if (typeof column.sortKey === 'function') return column.sortKey(row);
  if (column.sortKey) return row[column.sortKey] as SortablePrimitive;
  return row[column.key as keyof T] as SortablePrimitive;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  onRowClick,
}: TableProps<T>) {
  const [sortState, setSortState] = useState<SortState | null>(null);

  const sortedRows = useMemo(() => {
    if (!sortState) return rows;
    const column = columns.find((c) => c.key === sortState.key);
    if (!column) return rows;

    return [...rows].sort((a, b) => {
      const aValue = getSortValue(a, column);
      const bValue = getSortValue(b, column);

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortState.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue ?? '');
      const bStr = String(bValue ?? '');
      return sortState.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [columns, rows, sortState]);

  const toggleSort = (key: string) => {
    setSortState((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-900">
          <tr>
            {columns.map((column) => {
              const isActive = sortState?.key === column.key;
              const chevron = !column.sortable ? '' : isActive && sortState?.direction === 'desc' ? '▾' : '▴';

              return (
                <th key={column.key} className="border-b border-slate-800 px-3 py-2 text-left">
                  <button
                    type="button"
                    className={`flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-slate-400 ${column.sortable ? 'cursor-pointer hover:text-slate-200' : 'cursor-default'}`}
                    onClick={() => column.sortable && toggleSort(column.key)}
                  >
                    {column.header}
                    {column.sortable ? <span className="text-xs text-slate-500">{chevron}</span> : null}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              className={`border-b border-slate-800/70 hover:bg-slate-800/60 ${onRowClick ? 'cursor-pointer' : ''}`}
              style={{ backgroundColor: index % 2 === 0 ? '#121820' : '#151d27' }}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-3 py-2 text-slate-200 ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {column.render ? column.render(row) : String(row[column.key as keyof T] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
