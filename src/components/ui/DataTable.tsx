"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { clsx } from "clsx";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";

type SortDirection = "asc" | "desc";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  mobileLabel?: string;
  sortable?: boolean;
  className?: string;
};

type DataTableProps<T> = {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  sortKey?: string;
  sortDirection?: SortDirection;
  onSort?: (key: string, direction: SortDirection) => void;
  rowActions?: (row: T) => ReactNode;
  bulkActions?: ReactNode;
  pagination?: ReactNode;
  className?: string;
};

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  loading,
  error,
  onRetry,
  emptyTitle = "No records found",
  emptyDescription = "Create a record or adjust the current filters.",
  sortKey,
  sortDirection = "asc",
  onSort,
  rowActions,
  bulkActions,
  pagination,
  className
}: DataTableProps<T>) {
  if (loading) return <LoadingState rows={6} className={className} />;
  if (error) return <ErrorState description={error} onRetry={onRetry} className={className} />;
  if (!rows.length) return <EmptyState title={emptyTitle} description={emptyDescription} className={className} />;

  function handleSort(key: string) {
    if (!onSort) return;
    const nextDirection: SortDirection = sortKey === key && sortDirection === "asc" ? "desc" : "asc";
    onSort(key, nextDirection);
  }

  return (
    <div className={clsx("space-y-3", className)}>
      {bulkActions ? <div className="flex flex-wrap items-center justify-end gap-2">{bulkActions}</div> : null}

      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40 md:block">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => {
                const active = sortKey === column.key;
                const SortIcon = !active ? ChevronsUpDown : sortDirection === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th key={column.key} className={column.className}>
                    {column.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className="inline-flex items-center gap-1 font-semibold hover:text-slate-900 dark:hover:text-slate-100"
                      >
                        {column.header}
                        <SortIcon size={14} aria-hidden="true" />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {rowActions ? <th className="w-12"><span className="sr-only">Actions</span></th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowId(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    {column.cell(row)}
                  </td>
                ))}
                {rowActions ? <td className="text-left">{rowActions(row)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article key={getRowId(row)} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="space-y-3">
              {columns.map((column) => (
                <div key={column.key} className="flex items-start justify-between gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {column.mobileLabel ?? column.header}
                  </span>
                  <div className="min-w-0 text-right text-sm text-ink">{column.cell(row)}</div>
                </div>
              ))}
            </div>
            {rowActions ? <div className="mt-4 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">{rowActions(row)}</div> : null}
          </article>
        ))}
      </div>

      {pagination ? <div>{pagination}</div> : null}
    </div>
  );
}
