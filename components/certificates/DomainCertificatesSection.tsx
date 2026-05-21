'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { certificatesApi } from '@/lib/api-client';
import type { SslCertificate, CertificateStatus } from '@/types/certificates';

interface DomainCertificatesSectionProps {
  domainName: string;
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

const PRODUCT_DISPLAY_NAMES: Record<string, string> = {
  ssl123: 'SSL Lite — DigiCert',
  comodo_premiumssl_wildcard: 'SSL Wildcard MDDV — Sectigo',
  comodo_instantssl: 'Instant SSL Premium — Sectigo',
  sslwebserver_ev: 'SSL Webserver EV — Thawte',
};

function formatProductType(productType: string): string {
  return PRODUCT_DISPLAY_NAMES[productType] || productType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function CertificateRow({ cert }: { cert: SslCertificate }) {
  return (
    <Link
      href={`/certificates/${cert.id}`}
      className="flex items-center justify-between p-4 rounded-lg border border-border bg-surface/50 hover:shadow-md hover:border-accent/50 transition-all cursor-pointer"
    >
      <div>
        <p className="font-medium text-text">
          {formatProductType(cert.product_type)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {cert.expires_at
            ? `Expires ${new Date(cert.expires_at).toLocaleDateString()}`
            : 'Expiry date pending'}
        </p>
      </div>
      <div className="flex items-center gap-3">
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
  );
}

export function DomainCertificatesSection({ domainName }: DomainCertificatesSectionProps) {
  const [certificates, setCertificates] = useState<SslCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCertificates = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await certificatesApi.list(domainName);
      setCertificates(result.certificates || []);
    } catch {
      // Silently fail — certificates section is non-critical
      setCertificates([]);
    } finally {
      setIsLoading(false);
    }
  }, [domainName]);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  return (
    <Card title="SSL Certificates">
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse h-16 bg-gray-100 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            No SSL certificates for this domain.
          </p>
          <Link
            href={`/certificates/new?domain=${encodeURIComponent(domainName)}`}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-md transition-colors"
          >
            Purchase SSL Certificate
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {certificates.map((cert) => (
              <CertificateRow key={cert.id} cert={cert} />
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Link
              href={`/certificates/new?domain=${encodeURIComponent(domainName)}`}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-md transition-colors"
            >
              Purchase SSL Certificate
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
