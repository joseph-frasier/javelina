'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { certificatesApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import DomainValidationStatus from '@/components/certificates/DomainValidationStatus';
import type { SslCertificate, CertificateStatus } from '@/types/certificates';

interface CertificateDetailProps {
  certificateId: string;
}

const NON_TERMINAL_STATUSES: CertificateStatus[] = [
  'pending',
  'processing',
  'awaiting_approval',
  'in_progress',
];

const CANCELLABLE_STATUSES: CertificateStatus[] = [
  'pending',
  'processing',
  'awaiting_approval',
];

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

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-10 w-72 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-40 bg-gray-100 dark:bg-gray-700 rounded-xl" />
      <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-xl" />
    </div>
  );
}

export default function CertificateDetail({ certificateId }: CertificateDetailProps) {
  const { addToast } = useToastStore();

  const [certificate, setCertificate] = useState<SslCertificate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadCertificate = useCallback(async () => {
    try {
      const result = await certificatesApi.getById(certificateId);
      setCertificate(result.certificate);
    } catch (err: any) {
      setLoadError(err?.message || 'Certificate not found.');
    } finally {
      setIsLoading(false);
    }
  }, [certificateId]);

  useEffect(() => {
    loadCertificate();
  }, [loadCertificate]);

  // Poll status every 10 seconds for non-terminal statuses
  useEffect(() => {
    if (!certificate) return;
    if (!NON_TERMINAL_STATUSES.includes(certificate.status)) return;

    const intervalId = setInterval(async () => {
      try {
        const result = await certificatesApi.getStatus(certificateId);
        if (result.certificate) {
          setCertificate((prev) =>
            prev ? { ...prev, ...result.certificate } : result.certificate
          );
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 10_000);

    return () => clearInterval(intervalId);
  }, [certificateId, certificate?.status]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const result = await certificatesApi.download(certificateId);
      const pemContent = [
        result.certificate,
        result.ca_certificates,
      ]
        .filter(Boolean)
        .join('\n');

      const blob = new Blob([pemContent], { type: 'application/x-pem-file' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${result.domain ?? certificateId}.pem`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to download certificate.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await certificatesApi.cancel(certificateId);
      addToast('success', 'Certificate order cancelled.');
      setCertificate((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to cancel certificate.');
    } finally {
      setIsCancelling(false);
      setShowCancelConfirm(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  if (loadError || !certificate) {
    return (
      <div className="space-y-4">
        <Link href="/domains?tab=ssl-certificates" className="text-sm text-orange hover:text-orange/70 transition-colors">
          &larr; Back to SSL Certificates
        </Link>
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">
            {loadError || 'Certificate not found.'}
          </p>
        </div>
      </div>
    );
  }

  const canCancel = CANCELLABLE_STATUSES.includes(certificate.status);

  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div>
        <Link href="/domains?tab=ssl-certificates" className="text-sm text-orange hover:text-orange/70 transition-colors">
          &larr; Back to SSL Certificates
        </Link>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-orange-dark dark:text-white">
            {certificate.domain}
          </h1>
          <CertificateStatusBadge status={certificate.status} />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {formatProductType(certificate.product_type)}
        </p>
      </div>

      {/* Certificate details */}
      <Card title="Certificate Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Domain</p>
            <p className="text-sm text-orange-dark dark:text-white mt-1">{certificate.domain}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Product</p>
            <p className="text-sm text-orange-dark dark:text-white mt-1">{formatProductType(certificate.product_type)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Status</p>
            <div className="mt-1">
              <CertificateStatusBadge status={certificate.status} />
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Period</p>
            <p className="text-sm text-orange-dark dark:text-white mt-1">
              {certificate.period} {certificate.period === 1 ? 'year' : 'years'}
            </p>
          </div>
          {certificate.issued_at && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Issued</p>
              <p className="text-sm text-orange-dark dark:text-white mt-1">
                {new Date(certificate.issued_at).toLocaleDateString()}
              </p>
            </div>
          )}
          {certificate.expires_at && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Expires</p>
              <p className="text-sm text-orange-dark dark:text-white mt-1">
                {new Date(certificate.expires_at).toLocaleDateString()}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Created</p>
            <p className="text-sm text-orange-dark dark:text-white mt-1">
              {new Date(certificate.created_at).toLocaleDateString()}
            </p>
          </div>
          {certificate.amount_paid != null && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Amount Paid</p>
              <p className="text-sm text-orange-dark dark:text-white mt-1">
                ${(certificate.amount_paid / 100).toFixed(2)} {certificate.currency.toUpperCase()}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Contact info summary */}
      {certificate.contact_info && (
        <Card title="Contact Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Name</p>
              <p className="text-sm text-orange-dark dark:text-white mt-1">
                {certificate.contact_info.first_name} {certificate.contact_info.last_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Email</p>
              <p className="text-sm text-orange-dark dark:text-white mt-1 break-all">
                {certificate.contact_info.email}
              </p>
            </div>
            {certificate.contact_info.org_name && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Organization</p>
                <p className="text-sm text-orange-dark dark:text-white mt-1">
                  {certificate.contact_info.org_name}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Phone</p>
              <p className="text-sm text-orange-dark dark:text-white mt-1">{certificate.contact_info.phone}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Domain Validation Status — shown when awaiting approval */}
      {certificate.status === 'awaiting_approval' && (
        <DomainValidationStatus certificate={certificate} onUpdate={loadCertificate} />
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {certificate.status === 'active' && (
          <Button
            variant="primary"
            onClick={handleDownload}
            loading={isDownloading}
            disabled={isDownloading}
          >
            {isDownloading ? 'Downloading...' : 'Download Certificate'}
          </Button>
        )}
        {canCancel && (
          <Button
            variant="danger"
            onClick={() => setShowCancelConfirm(true)}
            disabled={isCancelling}
          >
            Cancel Order
          </Button>
        )}
      </div>

      {/* Cancel confirmation modal */}
      <ConfirmationModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancel}
        title="Cancel Certificate Order"
        message={`Are you sure you want to cancel the SSL certificate order for ${certificate.domain}? This action cannot be undone.`}
        confirmText="Cancel Order"
        cancelText="Keep Order"
        variant="danger"
        isLoading={isCancelling}
      />
    </div>
  );
}
