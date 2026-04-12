'use client';

import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import gsap from 'gsap';
import RegisterDomainsContent from '@/components/domains/RegisterDomainsContent';
import TransferDomainContent from '@/components/domains/TransferDomainContent';
import DomainsList from '@/components/domains/DomainsList';
import CertificatesList from '@/components/certificates/CertificatesList';
import { DomainCheckoutModal } from '@/components/modals/DomainCheckoutModal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { domainsApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import type { Domain, DomainRegistrationType } from '@/types/domains';

export default function DomainsPage() {
  const searchParams = useSearchParams();
  const { hideSslCertificates } = useFeatureFlags();
  const tab = searchParams.get('tab');
  const success = searchParams.get('success') === 'true';
  const cancelled = searchParams.get('cancelled') === 'true';

  const { addToast } = useToastStore();

  // Checkout modal
  const [checkoutModal, setCheckoutModal] = useState<{
    domain: string;
    registrationType: DomainRegistrationType;
    price: number;
    currency: string;
  } | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // My Domains
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);
  const [isMyDomainsExpanded, setIsMyDomainsExpanded] = useState(true);
  const myDomainsContentRef = useRef<HTMLDivElement>(null);
  const myDomainsTweenRef = useRef<gsap.core.Tween | null>(null);

  // Link domain
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkDomain, setLinkDomain] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const loadDomains = useCallback(async () => {
    try {
      setIsLoadingDomains(true);
      const result = await domainsApi.list();
      setDomains(result.domains || []);
    } catch (err) {
      console.error('Failed to load domains:', err);
    } finally {
      setIsLoadingDomains(false);
    }
  }, []);

  const toastFiredRef = useRef(false);

  useEffect(() => {
    loadDomains();
    if (toastFiredRef.current) return;
    if (success) {
      toastFiredRef.current = true;
      addToast('success', 'Payment successful! Your domain is being processed. This may take a few moments.');
    }
    if (cancelled) {
      toastFiredRef.current = true;
      addToast('warning', 'Checkout was cancelled. You can try again anytime.');
    }
  }, [loadDomains, success, cancelled, addToast]);

  useEffect(() => {
    return () => { myDomainsTweenRef.current?.kill(); };
  }, []);

  const handleLinkDomain = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = linkDomain.trim().toLowerCase();
    if (!trimmed) return;

    setIsLinking(true);
    try {
      await domainsApi.link(trimmed);
      addToast('success', `${trimmed} has been linked to your account.`);
      setLinkDomain('');
      setShowLinkForm(false);
      loadDomains();
    } catch (err: any) {
      const message = err?.details || err?.message || 'Failed to link domain';
      addToast('error', typeof message === 'string' ? message : 'Failed to link domain');
    } finally {
      setIsLinking(false);
    }
  };

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
    loadDomains();
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
    <div className="space-y-8">
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

      {/* Link Domain callout */}
      <div className="p-4 rounded-lg bg-orange-light dark:bg-gray-800 border border-gray-light dark:border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-dark dark:text-white">
              Already purchased or transferred a domain through the OpenSRS Storefront?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Link it to your Javelina account to manage it here.
            </p>
          </div>
          {!showLinkForm && (
            <Button variant="outline" size="sm" onClick={() => setShowLinkForm(true)}>
              Link domain
            </Button>
          )}
        </div>

        {showLinkForm && (
          <form onSubmit={handleLinkDomain} className="mt-4 flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label="Domain name"
                placeholder="e.g. mydomain.com"
                value={linkDomain}
                onChange={(e) => setLinkDomain(e.target.value)}
              />
            </div>
            <Button type="submit" variant="primary" size="md" disabled={isLinking || !linkDomain.trim()}>
              {isLinking ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Linking...
                </span>
              ) : (
                'Link'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => { setShowLinkForm(false); setLinkDomain(''); }}
              disabled={isLinking}
            >
              Cancel
            </Button>
          </form>
        )}
      </div>

      {/* Register + Transfer — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <RegisterDomainsContent onCheckout={handleCheckout('new')} />
        <TransferDomainContent onCheckout={handleCheckout('transfer')} />
      </div>

      {/* My Domains — collapsible with GSAP */}
      <div className="rounded-xl bg-white dark:bg-gray-slate shadow-md border border-gray-light hover:shadow-lg transition-shadow overflow-hidden">
        <button
          type="button"
          onClick={() => {
            const el = myDomainsContentRef.current;
            if (!el) return;
            if (myDomainsTweenRef.current) myDomainsTweenRef.current.kill();

            const next = !isMyDomainsExpanded;
            setIsMyDomainsExpanded(next);

            if (next) {
              el.style.height = '0px';
              el.style.display = 'block';
              const fullH = el.scrollHeight;
              myDomainsTweenRef.current = gsap.to(el, {
                height: fullH,
                duration: 0.35,
                ease: 'power2.out',
                onComplete: () => { el.style.height = 'auto'; },
              });
            } else {
              gsap.set(el, { height: el.scrollHeight });
              myDomainsTweenRef.current = gsap.to(el, {
                height: 0,
                duration: 0.3,
                ease: 'power2.inOut',
                onComplete: () => { el.style.display = 'none'; },
              });
            }
          }}
          className="w-full flex items-center justify-between p-6 cursor-pointer"
        >
          <h2 className="text-base font-semibold text-orange">
            My Domains{!isLoadingDomains && domains.length > 0 ? ` (${domains.length})` : ''}
          </h2>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isMyDomainsExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        <div ref={myDomainsContentRef} className="px-6 pb-6">
          <DomainsList domains={domains} isLoading={isLoadingDomains} />
        </div>
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
