'use client';

import { useMemo } from 'react';
import { clsx } from 'clsx';
import type { GlobalSearchUiResult } from '@/components/search/useGlobalSearch';

interface SearchResultListProps {
  results: GlobalSearchUiResult[];
  selectedIndex: number;
  onHover: (index: number) => void;
  onSelect: (result: GlobalSearchUiResult) => void;
}

const TYPE_LABELS: Record<string, string> = {
  action: 'Actions',
  organization: 'Organizations',
  zone: 'Zones',
  dns_record: 'DNS Records',
  tag: 'Tags',
  user: 'Users',
  discount_code: 'Discount Codes',
  audit_event: 'Audit Events',
  support_conversation: 'Support Conversations',
};

export function SearchResultList({
  results,
  selectedIndex,
  onHover,
  onSelect,
}: SearchResultListProps) {
  const grouped = useMemo(() => {
    const groups = new Map<string, Array<{ result: GlobalSearchUiResult; index: number }>>();
    results.forEach((result, index) => {
      const key = result.type;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push({ result, index });
    });
    return groups;
  }, [results]);

  if (results.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-gray-slate dark:text-gray-300">
        No results found
      </div>
    );
  }

  return (
    <div className="max-h-[55vh] overflow-y-auto pr-1">
      {Array.from(grouped.entries()).map(([type, items]) => (
        <div key={type} className="mb-4">
          <h4 className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-slate dark:text-gray-400">
            {TYPE_LABELS[type] || type}
          </h4>
          <div className="space-y-1">
            {items.map(({ result, index }) => (
              <button
                key={`${result.type}:${result.id}`}
                type="button"
                onMouseEnter={() => onHover(index)}
                onClick={() => onSelect(result)}
                className={clsx(
                  'w-full rounded-md px-3 py-2 text-left transition-colors',
                  selectedIndex === index
                    ? 'bg-orange/10 dark:bg-orange/20'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-orange-dark dark:text-gray-100">
                    {result.title}
                  </p>
                  {'badge' in result && result.badge ? (
                    <span className="rounded bg-gray-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                      {result.badge}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-xs text-gray-slate dark:text-gray-400">{result.subtitle}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

