'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import RegisterDomainsContent from '@/components/domains/RegisterDomainsContent';
import TransferDomainContent from '@/components/domains/TransferDomainContent';
import MyDomainsContent from '@/components/domains/MyDomainsContent';
import CertificatesList from '@/components/certificates/CertificatesList';
import { DomainCheckoutModal } from '@/components/modals/DomainCheckoutModal';
import { useToastStore } from '@/lib/toast-store';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import type { DomainRegistrationType } from '@/types/domains';

const TABS = [
  { param: 'register', href: '/domains', label: 'Register Domains' },
  { param: 'transfer', href: '/domains?tab=transfer', label: 'Transfer Domain' },
  { param: 'my-domains', href: '/domains?tab=my-domains', label: 'My Domains' },
] as const;

export default function DomainsPage() {
  const searchParams = useSearchParams();
  const { hideSslCertificates } = useFeatureFlags();
  const tab = searchParams.get('tab') || 'register';
  const success = searchParams.get('success') === 'true';
  const cancelled = searchParams.get('cancelled') === 'true';

  const { addToast } = useToastStore();
  const toastFiredRef = useRef(false);

  // Checkout modal
  const [checkoutModal, setCheckoutModal] = useState<{
    domain: string;
    registrationType: DomainRegistrationType;
    price: number;
    currency: string;
  } | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    if (toastFiredRef.current) return;
    if (success) {
      toastFiredRef.current = true;
      addToast('success', 'Payment successful! Your domain is being processed. This may take a few moments.');
    }
    if (cancelled) {
      toastFiredRef.current = true;
      addToast('warning', 'Checkout was cancelled. You can try again anytime.');
    }
  }, [success, cancelled, addToast]);

  const handleCheckout = (registrationType: DomainRegistrationType) => (
    domain: string,
    price: number,
    currency: string
  ) => {
    setCheckoutModal({ domain, registrationType, price, currency });
    setIsCheckoutOpen(true);
  };

  const handleCheckoutClose = () => {
    setIsCheckoutOpen(false);
  };

  const handleCheckoutSuccess = () => {
    setIsCheckoutOpen(false);
  };

  // SSL Certificates — render exclusively when that tab is active
  if (!hideSslCertificates && tab === 'ssl-certificates') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-dark dark:text-white">SSL Certificates</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Purchase and manage SSL/TLS certificates for your domains.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <Link href="/domains" className="text-sm text-orange hover:text-orange/70 transition-colors">
            &larr; Back to Domains
          </Link>
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-orange-dark dark:text-white">Domains</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Search, register, and manage your domain names.
          </p>
        </div>
        {!hideSslCertificates && (
          <Link
            href="/domains?tab=ssl-certificates"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-orange hover:text-orange/70 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            SSL Certificates
          </Link>
        )}
      </div>

      {/* Tab Navigation */}
      <nav className="flex gap-6 border-b border-gray-light dark:border-gray-700">
        {TABS.map((t) => {
          const isActive = tab === t.param;
          return (
            <Link
              key={t.param}
              href={t.href}
              className={`pb-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-orange-dark dark:text-orange border-b-2 border-orange'
                  : 'text-gray-slate dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {/* Tab Content */}
      <div className={tab === 'register' ? '' : 'hidden'}>
        <RegisterDomainsContent onCheckout={handleCheckout('new')} />
      </div>
      <div className={tab === 'transfer' ? '' : 'hidden'}>
        <TransferDomainContent onCheckout={handleCheckout('transfer')} />
      </div>
      <div className={tab === 'my-domains' ? '' : 'hidden'}>
        <MyDomainsContent success={success} />
      </div>

      {/* Checkout Modal */}
      {checkoutModal && (
        <DomainCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={handleCheckoutClose}
          domain={checkoutModal.domain}
          registrationType={checkoutModal.registrationType}
          price={checkoutModal.price}
          currency={checkoutModal.currency}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
}
