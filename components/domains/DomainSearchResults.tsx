'use client';

import { DomainSearchResult } from '@/types/domains';
import Button from '@/components/ui/Button';

interface DomainSearchResultsProps {
  results: DomainSearchResult[];
  title: string;
  onRegister: (domain: string) => void;
  onTransfer: (domain: string) => void;
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
  onTransfer,
}: DomainSearchResultsProps) {
  if (results.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        {title}
      </h3>
      <div className="space-y-2">
        {results.map((result) => (
          <div
            key={result.domain}
            className="flex items-center justify-between p-4 rounded-lg border border-gray-light dark:border-gray-700 bg-white dark:bg-gray-slate/50 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <span className="font-medium text-orange-dark dark:text-white">
                {result.domain}
              </span>
              <StatusBadge status={result.status} />
            </div>
            <div className="flex items-center gap-4">
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
              {result.status === 'taken' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTransfer(result.domain)}
                >
                  Transfer
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
