'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Domain } from '@/types/domains';
import { Pagination } from '@/components/admin/Pagination';

const DOMAINS_PER_PAGE = 10;

interface DomainsListProps {
  domains: Domain[];
  isLoading: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; dotColor: string; pulse?: boolean }> = {
  pending: { label: 'Pending', dotColor: 'bg-yellow-500' },
  processing: { label: 'Processing', dotColor: 'bg-yellow-500' },
  active: { label: 'Active', dotColor: 'bg-green-500', pulse: true },
  expired: { label: 'Expired', dotColor: 'bg-red-500' },
  transferring: { label: 'Transferring', dotColor: 'bg-purple-500' },
  transfer_complete: { label: 'Transferred', dotColor: 'bg-green-500' },
  failed: { label: 'Failed', dotColor: 'bg-red-500' },
  cancelled: { label: 'Cancelled', dotColor: 'bg-gray-400' },
};

function getRelativeExpiry(expiresAt: string) {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: `Expired ${Math.abs(days)}d ago`, color: 'text-red-500' };
  if (days < 30) return { text: `${days}d left`, color: 'text-red-500' };
  if (days < 90) return { text: `${days}d left`, color: 'text-yellow-500' };
  return { text: `${days}d left`, color: 'text-green-500 dark:text-green-400' };
}

export default function DomainsList({ domains, isLoading }: DomainsListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => { setCurrentPage(1); }, [domains]);

  const totalPages = Math.ceil(domains.length / DOMAINS_PER_PAGE);
  const pagedDomains = domains.slice(
    (currentPage - 1) * DOMAINS_PER_PAGE,
    currentPage * DOMAINS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse h-20 bg-gray-100 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500 dark:text-gray-400">
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
      {pagedDomains.map((domain) => {
        const dotIndex = domain.domain_name.lastIndexOf('.');
        const name = domain.domain_name.slice(0, dotIndex);
        const tld = domain.domain_name.slice(dotIndex);
        const statusConf = STATUS_CONFIG[domain.status] || STATUS_CONFIG.pending;
        const expiry = domain.expires_at ? getRelativeExpiry(domain.expires_at) : null;

        return (
          <Link
            key={domain.id}
            href={`/domains/${domain.id}`}
            className="flex items-center justify-between p-5 rounded-xl border-l-2 border-l-transparent border border-border bg-surface dark:bg-surface/[0.02] hover:border-l-orange hover:shadow-md hover:bg-surface-hover dark:hover:bg-surface/[0.04] transition-all"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="min-w-0">
                <p className="text-base">
                  <span className="font-semibold text-text">{name}</span>
                  <span className="text-accent font-mono font-semibold">{tld}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {domain.registration_type === 'linked' ? 'Linked' : domain.registration_type === 'transfer' ? 'Transfer' : 'Registration'}
                  {domain.registered_at && ` · ${new Date(domain.registered_at).toLocaleDateString()}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              {expiry && (
                <span className={`text-xs font-medium ${expiry.color}`}>
                  {expiry.text}
                </span>
              )}
              {domain.amount_paid != null && (
                <span className="font-mono text-xs bg-gray-100 dark:bg-surface/5 text-gray-500 dark:text-gray-400 px-2 py-1 rounded">
                  ${(domain.amount_paid / 100).toFixed(2)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${statusConf.dotColor} ${statusConf.pulse ? 'animate-pulse' : ''}`} />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{statusConf.label}</span>
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </Link>
        );
      })}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={domains.length}
          itemsPerPage={DOMAINS_PER_PAGE}
        />
      )}
    </div>
  );
}
