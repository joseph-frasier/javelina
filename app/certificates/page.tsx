'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CertificatesList from '@/components/certificates/CertificatesList';

export default function CertificatesPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const cancelled = searchParams.get('cancelled') === 'true';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-orange-dark dark:text-white">
            SSL Certificates
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Purchase and manage SSL/TLS certificates for your domains.
          </p>
        </div>
        <Link
          href="/certificates/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange text-white text-sm font-medium hover:bg-orange/90 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Purchase Certificate
        </Link>
      </div>

      <CertificatesList success={success} cancelled={cancelled} />
    </div>
  );
}
