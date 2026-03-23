'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import RegisterDomainsContent from '@/components/domains/RegisterDomainsContent';
import TransferDomainContent from '@/components/domains/TransferDomainContent';
import MyDomainsContent from '@/components/domains/MyDomainsContent';
import CertificatesList from '@/components/certificates/CertificatesList';

const TABS = [
  { param: 'register', href: '/domains', label: 'Register Domains' },
  { param: 'transfer', href: '/domains?tab=transfer', label: 'Transfer Domain' },
  { param: 'my-domains', href: '/domains?tab=my-domains', label: 'My Domains' },
  { param: 'ssl-certificates', href: '/domains?tab=ssl-certificates', label: 'SSL Certificates' },
] as const;

export default function DomainsPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'register';
  const success = searchParams.get('success') === 'true';
  const cancelled = searchParams.get('cancelled') === 'true';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-orange-dark dark:text-white">
          Domains
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Search, register, and manage your domain names.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
            Payment successful! Your order is being processed. This may take a few moments.
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

      <nav className="inline-flex gap-6">
        {TABS.map((t) => {
          const isActive = tab === t.param;
          return (
            <Link
              key={t.param}
              href={t.href}
              className={`pb-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-orange'
                  : 'text-gray-slate dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className={tab === 'register' ? '' : 'hidden'}>
        <RegisterDomainsContent />
      </div>
      <div className={tab === 'transfer' ? '' : 'hidden'}>
        <TransferDomainContent />
      </div>
      <div className={tab === 'my-domains' ? '' : 'hidden'}>
        <MyDomainsContent success={success} />
      </div>
      <div className={tab === 'ssl-certificates' ? '' : 'hidden'}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Purchase and manage SSL/TLS certificates for your domains.
          </p>
          <Link
            href="/certificates/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange text-white text-sm font-medium hover:bg-orange/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Purchase Certificate
          </Link>
        </div>
        <CertificatesList success={success} cancelled={cancelled} />
      </div>
    </div>
  );
}
