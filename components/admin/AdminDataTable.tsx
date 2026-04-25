'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Pagination } from '@/components/admin/Pagination';
import { SelectAllCheckbox } from '@/components/admin/SelectAllCheckbox';
import { BulkActionBar } from '@/components/admin/BulkActionBar';

type SortDirection = 'asc' | 'desc' | null;

export interface AdminDataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number | Date | null | undefined;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
}

export interface AdminDataTableBulkActions {
  onDelete?: () => void;
  onSuspend?: () => void;
  onEnable?: () => void;
}

export interface AdminDataTableProps<T> {
  data: T[];
  columns: AdminDataTableColumn<T>[];
  getRowId: (row: T) => string;
  searchKeys?: (row: T) => string;
  searchPlaceholder?: string;
  initialSearchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectable?: boolean;
  bulkActions?: AdminDataTableBulkActions;
  onSelectionChange?: (ids: Set<string>) => void;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  emptyState?: React.ReactNode;
  pageSize?: number;
  defaultSort?: { key: string; direction: 'asc' | 'desc' };
  toolbarLeft?: React.ReactNode;
  toolbarRight?: React.ReactNode;
  loading?: boolean;
  loadingRows?: number;
  className?: string;
}

const ALIGN_CLASS: Record<NonNullable<AdminDataTableColumn<unknown>['align']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function defaultEmptyState(query: string): React.ReactNode {
  return (
    <div className="py-12 flex items-center justify-center">
      <div className="text-center">
        <svg
          className="mx-auto h-10 w-10 text-text-faint mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm text-text-muted">
          {query.trim() ? `No results for "${query}"` : 'No data to display'}
        </p>
      </div>
    </div>
  );
}

export function AdminDataTable<T>({
  data,
  columns,
  getRowId,
  searchKeys,
  searchPlaceholder = 'Search…',
  initialSearchQuery = '',
  onSearchChange,
  selectable = false,
  bulkActions,
  onSelectionChange,
  onRowClick,
  rowClassName,
  emptyState,
  pageSize = 25,
  defaultSort,
  toolbarLeft,
  toolbarRight,
  loading = false,
  loadingRows = 5,
  className,
}: AdminDataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [sortKey, setSortKey] = useState<string | null>(defaultSort?.key ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSort?.direction ?? null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (onSearchChange) onSearchChange(searchQuery);
  }, [searchQuery, onSearchChange]);

  useEffect(() => {
    if (onSelectionChange) onSelectionChange(selectedIds);
  }, [selectedIds, onSelectionChange]);

  const filteredData = useMemo(() => {
    if (!searchKeys || !searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((row) => searchKeys(row).toLowerCase().includes(q));
  }, [data, searchKeys, searchQuery]);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredData;
    const column = columns.find((c) => c.key === sortKey);
    if (!column) return filteredData;
    const valueOf = column.sortValue ?? ((row: T) => {
      const v = column.render(row);
      return typeof v === 'string' || typeof v === 'number' ? v : String(v ?? '');
    });
    const sorted = [...filteredData].sort((a, b) => {
      const aVal = valueOf(a);
      const bVal = valueOf(b);
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDirection === 'asc'
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return sorted;
  }, [filteredData, sortKey, sortDirection, columns]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginatedData = sortedData.slice(pageStart, pageStart + pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const toggleRowSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      paginatedData.forEach((row) => next.add(getRowId(row)));
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(sortedData.map((row) => getRowId(row))));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const pageSelectedCount = paginatedData.filter((row) =>
    selectedIds.has(getRowId(row))
  ).length;

  const renderSortIcon = (column: AdminDataTableColumn<T>) => {
    if (column.sortable === false) return null;
    const active = sortKey === column.key;
    const dir = active ? sortDirection : null;
    return (
      <span className="ml-1 inline-flex flex-col text-text-faint">
        <svg
          className={clsx('h-2.5 w-2.5 -mb-0.5', dir === 'asc' && 'text-accent')}
          fill="currentColor"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path d="M6 3l4 4H2z" />
        </svg>
        <svg
          className={clsx('h-2.5 w-2.5', dir === 'desc' && 'text-accent')}
          fill="currentColor"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path d="M6 9L2 5h8z" />
        </svg>
      </span>
    );
  };

  const showToolbar = Boolean(searchKeys) || Boolean(toolbarLeft) || Boolean(toolbarRight);
  const totalCount = sortedData.length;

  return (
    <div className={clsx('rounded-xl border border-border bg-surface overflow-hidden', className)}>
      {showToolbar && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {searchKeys && (
              <div className="relative w-full sm:max-w-xs">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-faint pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-surface-alt text-sm text-text placeholder:text-text-faint transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-focus-ring"
                />
              </div>
            )}
            {toolbarLeft}
          </div>
          {toolbarRight && <div className="flex items-center gap-2">{toolbarRight}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-alt border-b border-border">
            <tr>
              {selectable && (
                <th className="w-10 px-4 py-3 text-left">
                  <SelectAllCheckbox
                    selectedCount={selectedIds.size}
                    pageCount={paginatedData.length}
                    totalCount={totalCount}
                    pageSelectedCount={pageSelectedCount}
                    onSelectPage={selectPage}
                    onSelectAll={selectAll}
                    onSelectNone={clearSelection}
                  />
                </th>
              )}
              {columns.map((column) => {
                const sortable = column.sortable !== false;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={clsx(
                      'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted',
                      ALIGN_CLASS[column.align ?? 'left'],
                      column.headerClassName
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className="inline-flex items-center hover:text-text transition-colors focus-visible:outline-none focus-visible:text-accent"
                        aria-label={`Sort by ${typeof column.header === 'string' ? column.header : column.key}`}
                      >
                        {column.header}
                        {renderSortIcon(column)}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: loadingRows }).map((_, i) => (
                <tr key={`loading-${i}`} className="border-b border-border last:border-b-0">
                  {selectable && (
                    <td className="px-4 py-4">
                      <div className="h-4 w-4 rounded bg-surface-alt animate-pulse" />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-4">
                      <div className="h-4 w-full max-w-[160px] rounded bg-surface-alt animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4"
                >
                  {emptyState ?? defaultEmptyState(searchQuery)}
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => {
                const id = getRowId(row);
                const isSelected = selectedIds.has(id);
                const clickable = Boolean(onRowClick);
                return (
                  <tr
                    key={id}
                    onClick={clickable ? () => onRowClick?.(row) : undefined}
                    className={clsx(
                      'border-b border-border last:border-b-0 transition-colors',
                      clickable && 'cursor-pointer hover:bg-surface-hover',
                      !clickable && 'hover:bg-surface-hover',
                      isSelected && 'bg-accent-soft/40',
                      rowClassName?.(row)
                    )}
                  >
                    {selectable && (
                      <td
                        className="w-10 px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRowSelected(id)}
                          className="w-4 h-4 text-accent border-border rounded focus:ring-accent cursor-pointer"
                          aria-label={`Select row ${id}`}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={clsx(
                          'px-4 py-3 text-sm text-text',
                          ALIGN_CLASS[column.align ?? 'left'],
                          column.className
                        )}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-border">
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalCount}
            itemsPerPage={pageSize}
          />
        </div>
      )}

      {selectable && bulkActions && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={totalCount}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onDelete={bulkActions.onDelete}
          onSuspend={bulkActions.onSuspend}
          onEnable={bulkActions.onEnable}
        />
      )}
    </div>
  );
}
