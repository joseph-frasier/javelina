'use client';

import { useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { SearchResultList } from '@/components/search/SearchResultList';
import type { GlobalSearchContext } from '@/lib/api-client';
import type { UseGlobalSearchReturn } from '@/components/search/useGlobalSearch';

interface GlobalSearchModalProps {
  context: GlobalSearchContext;
  search: UseGlobalSearchReturn;
}

export function GlobalSearchModal({ context, search }: GlobalSearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const placeholderText =
    context === 'admin'
      ? 'Search users, organizations, zones, records, and more...'
      : 'Search organizations, zones, records, tags, and more...';

  useEffect(() => {
    if (!search.isOpen) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [search.isOpen]);

  return (
    <Modal
      isOpen={search.isOpen}
      onClose={search.closeSearch}
      title="Search"
      subtitle="Use arrow keys to navigate and Enter to open"
      size="xlarge"
    >
      <div className="space-y-4">
        <div className="relative">
          <input
            ref={inputRef}
            type="search"
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            onKeyDown={search.onKeyDown}
            placeholder={placeholderText}
            className="w-full rounded-md border border-gray-light bg-white px-4 py-3 pl-11 text-sm text-gray-900 outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {context === 'member' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => search.setScope('current')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                search.effectiveScope === 'current'
                  ? 'bg-orange text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              Current Organization
            </button>
            <button
              type="button"
              onClick={() => search.setScope('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                search.effectiveScope === 'all'
                  ? 'bg-orange text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              All Organizations
            </button>
          </div>
        )}

        {search.loading ? (
          <div className="py-10 text-center text-sm text-gray-slate dark:text-gray-300">
            Searching...
          </div>
        ) : search.error ? (
          <div className="py-10 text-center text-sm text-red-600 dark:text-red-400">
            {search.error}
          </div>
        ) : (
          <SearchResultList
            results={search.mergedResults}
            selectedIndex={search.selectedIndex}
            onHover={search.setSelectedIndex}
            onSelect={search.selectResult}
          />
        )}

        <div className="flex items-center justify-between pt-3 text-xs text-gray-slate dark:text-gray-400">
          <span>Shortcut: {search.shortcutHint}</span>
          <span>Close: Esc</span>
        </div>
      </div>
    </Modal>
  );
}
