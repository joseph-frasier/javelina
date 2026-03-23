'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { certificatesApi } from '@/lib/api-client';
import type { SslCertificate, CertificateStatus } from '@/types/certificates';

interface CertificatesListProps {
  success?: boolean;
  cancelled?: boolean;
}

function formatProductType(productType: string): string {
  return productType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function CertificateStatusBadge({ status }: { status: CertificateStatus }) {
  const config: Record<CertificateStatus, { label: string; className: string }> = {
    active: {
      label: 'Active',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    },
    pending: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    processing: {
      label: 'Processing',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    awaiting_approval: {
      label: 'Awaiting Approval',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    in_progress: {
      label: 'In Progress',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    renewing: {
      label: 'Renewing',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    expired: {
      label: 'Expired',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
    declined: {
      label: 'Declined',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    },
  };

  const { label, className } = config[status] ?? config.pending;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function CertificatesListItems({
  certificates,
  isLoading,
}: {
  certificates: SslCertificate[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse h-16 bg-gray-100 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <svg
          className="mx-auto h-12 w-12 mb-4 text-gray-300 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
        <p className="text-lg font-medium">No SSL certificates yet</p>
        <p className="mt-1">Purchase a certificate to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {certificates.map((cert) => (
        <Link
          key={cert.id}
          href={`/certificates/${cert.id}`}
          className="flex items-center justify-between p-4 rounded-lg border border-gray-light dark:border-gray-700 bg-white dark:bg-gray-slate/50 hover:shadow-md hover:border-orange/50 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div>
              <p className="font-medium text-orange-dark dark:text-white">{cert.domain}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatProductType(cert.product_type)}
                {cert.expires_at &&
                  ` · Expires ${new Date(cert.expires_at).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {cert.amount_paid && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ${(cert.amount_paid / 100).toFixed(2)}
              </span>
            )}
            <CertificateStatusBadge status={cert.status} />
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function CertificatesList({ success, cancelled }: CertificatesListProps) {
  const [certificates, setCertificates] = useState<SslCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCertificates = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await certificatesApi.list();
      setCertificates(result.certificates || []);
    } catch (err) {
      console.error('Failed to load certificates:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  useEffect(() => {
    if (success) {
      loadCertificates();
    }
  }, [success, loadCertificates]);

  return (
    <div className="space-y-6">
      {success && (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
            Payment successful! Your SSL certificate is being processed. This may take a few moments.
          </p>
        </div>
      )}
      {cancelled && (
        <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
            Checkout was cancelled. You can try again anytime.
          </p>
        </div>
      )}

      <Card title="My SSL Certificates">
        <CertificatesListItems certificates={certificates} isLoading={isLoading} />
      </Card>
    </div>
  );
}
