'use client';

import Link from 'next/link';
import { Domain } from '@/types/domains';

interface DomainsListProps {
  domains: Domain[];
  isLoading: boolean;
}

function DomainStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    processing: {
      label: 'Processing',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    },
    active: {
      label: 'Active',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    },
    expired: {
      label: 'Expired',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
    transferring: {
      label: 'Transferring',
      className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    },
    transfer_complete: {
      label: 'Transferred',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    },
  };

  const { label, className } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export default function DomainsList({ domains, isLoading }: DomainsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse h-16 bg-gray-100 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <svg className="mx-auto h-12 w-12 mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
        <p className="text-lg font-medium">No domains yet</p>
        <p className="mt-1">Search for a domain above to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {domains.map((domain) => (
        <Link
          key={domain.id}
          href={`/domains/${domain.id}`}
          className="flex items-center justify-between p-4 rounded-lg border border-gray-light dark:border-gray-700 bg-white dark:bg-gray-slate/50 hover:shadow-md hover:border-orange/50 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div>
              <p className="font-medium text-orange-dark dark:text-white">
                {domain.domain_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {domain.registration_type === 'linked' ? 'Linked' : domain.registration_type === 'transfer' ? 'Transfer' : 'Registration'}
                {domain.registered_at && ` · Registered ${new Date(domain.registered_at).toLocaleDateString()}`}
                {domain.expires_at && ` · Expires ${new Date(domain.expires_at).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {domain.amount_paid && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ${(domain.amount_paid / 100).toFixed(2)}
              </span>
            )}
            <DomainStatusBadge status={domain.status} />
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </Link>
      ))}
    </div>
  );
}
