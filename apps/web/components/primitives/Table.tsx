'use client';

import React, { useMemo, useState } from 'react';

type SortDirection = 'asc' | 'desc';

type Column<T> = {
  key: keyof T;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'right';
  render?: (row: T) => React.ReactNode;
};

type TableProps<T extends Record<string, unknown>> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
};

export function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  onRowClick,
}: TableProps<T>) {
  const [sortState, setSortState] = useState<{ key: keyof T; direction: SortDirection } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sortState) return rows;
    const { key, direction } = sortState;

    return [...rows].sort((a, b) => {
      const av = a[key];
      const bv = b[key];

      if (typeof av === 'number' && typeof bv === 'number') {
        return direction === 'asc' ? av - bv : bv - av;
      }

      const as = String(av ?? '');
      const bs = String(bv ?? '');
      return direction === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [rows, sortState]);

  const toggleSort = (key: keyof T) => {
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
              const chevron =
                !column.sortable ? '' : isActive && sortState?.direction === 'desc' ? '▾' : '▴';

              return (
                <th key={String(column.key)} className="border-b border-slate-800 px-3 py-2 text-left">
                  <button
                    type="button"
                    className={`flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-slate-400 ${
                      column.sortable ? 'cursor-pointer hover:text-slate-200' : 'cursor-default'
                    }`}
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
                  key={String(column.key)}
                  className={`px-3 py-2 text-slate-200 ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {column.render ? column.render(row) : String(row[column.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
