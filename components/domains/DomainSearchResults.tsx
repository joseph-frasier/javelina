'use client';

import { useState, useEffect } from 'react';
import { DomainSearchResult } from '@/types/domains';
import Button from '@/components/ui/Button';
import { Pagination } from '@/components/admin/Pagination';

const RESULTS_PER_PAGE = 6;

interface DomainSearchResultsProps {
  results: DomainSearchResult[];
  title: string;
  onRegister: (domain: string) => void;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    available: {
      label: 'Available',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    },
    taken: {
      label: 'Taken',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
    in_progress: {
      label: 'Checking...',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    undetermined: {
      label: 'Unknown',
      className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    },
  };

  const { label, className } = config[status] || config.undetermined;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export default function DomainSearchResults({
  results,
  title,
  onRegister,
}: DomainSearchResultsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => { setCurrentPage(1); }, [results]);

  if (results.length === 0) return null;

  const totalPages = Math.ceil(results.length / RESULTS_PER_PAGE);
  const pagedResults = results.slice(
    (currentPage - 1) * RESULTS_PER_PAGE,
    currentPage * RESULTS_PER_PAGE
  );

  return (
    <div>
      {title && (
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          {title}
        </h3>
      )}
      <div className="space-y-2">
        {pagedResults.map((result) => (
          <div
            key={result.domain}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 rounded-lg border border-border bg-surface/50 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-medium text-text truncate">
                {result.domain}
              </span>
              <StatusBadge status={result.status} />
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4">
              {result.pricing && (
                <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  ${result.pricing.price.toFixed(2)}/yr
                </span>
              )}
              {result.status === 'available' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onRegister(result.domain)}
                >
                  Register
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={results.length}
          itemsPerPage={RESULTS_PER_PAGE}
        />
      )}
    </div>
  );
}
