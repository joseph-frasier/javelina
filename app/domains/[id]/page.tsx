'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { domainsApi } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { useToastStore } from '@/lib/toast-store';
import { AddZoneModal } from '@/components/modals/AddZoneModal';
import { EditWhoisModal } from '@/components/modals/EditWhoisModal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Pagination } from '@/components/admin/Pagination';
import { DomainCertificatesSection } from '@/components/certificates/DomainCertificatesSection';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import { JAVELINA_NAMESERVERS } from '@/lib/domain-constants';
import type {
  Domain,
  DomainManagementResponse,
  DomainContact,
  DomainPricing,
} from '@/types/domains';

const ORG_PAGE_SIZE = 5;

function extractErrorMessage(err: any, fallback: string): string {
  const raw = err?.details || err?.message;
  if (!raw) return fallback;
  const msg = typeof raw === 'string' ? raw : raw?.error || raw?.message || JSON.stringify(raw);
  if (typeof msg === 'string' && msg.includes('Object status prohibits operation')) {
    return 'The domain is currently locked. Disable the Domain Lock above and wait a few minutes for the change to propagate, then try again.';
  }
  return msg;
}

function NsCopyButton({ ns, index }: { ns: string; index: number }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ns);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback ignored
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
      aria-label={`Copy ${ns}`}
    >
      <span className="text-sm font-mono text-gray-800 dark:text-gray-200">{ns}</span>
      {copied ? (
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
    processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    active: { label: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    expired: { label: 'Expired', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    transferring: { label: 'Transferring', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
    transfer_complete: { label: 'Transferred', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  };
  const { label, className } = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
      <p className="text-sm text-red-700 dark:text-red-400">{message}</p>
    </div>
  );
}

export default function DomainDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { hideSslCertificates } = useFeatureFlags();
  const domainId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DomainManagementResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Settings state
  const [autoRenew, setAutoRenew] = useState(false);
  const [isTogglingAutoRenew, setIsTogglingAutoRenew] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const [domainLocked, setDomainLocked] = useState(false);

  // Nameservers state
  const [nameservers, setNameservers] = useState<string[]>(['', '']);
  const [isSavingNs, setIsSavingNs] = useState(false);

  // Contact state
  const [contact, setContact] = useState<DomainContact>({
    first_name: '', last_name: '', org_name: '', email: '', phone: '',
    address1: '', address2: '', city: '', state: '', postal_code: '', country: 'US',
  });
  const [isWhoisModalOpen, setIsWhoisModalOpen] = useState(false);

  // Zone modal state
  const [orgPage, setOrgPage] = useState(1);
  const [isAddZoneOpen, setIsAddZoneOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedOrgName, setSelectedOrgName] = useState('');

  // Unlink state
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  // Renewal state
  const [renewalPricing, setRenewalPricing] = useState<DomainPricing | null>(null);
  const [selectedYears, setSelectedYears] = useState(1);
  const [isRenewing, setIsRenewing] = useState(false);

  // URL param banners
  const renewedParam = searchParams.get('renewed');
  const renewalCancelledParam = searchParams.get('renewal_cancelled');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const result = await domainsApi.getManagement(domainId);
      setData(result);

      setAutoRenew(result.domain.auto_renew || false);
      setDomainLocked(result.live?.locked ?? false);

      // Populate nameservers from live data or DB
      const ns = result.live?.nameservers || result.domain.nameservers?.map(n => n.name) || [];
      setNameservers(ns.length >= 2 ? ns : [...ns, ...Array(2 - ns.length).fill('')]);

      // Populate contact from live data or DB
      const liveContact = result.live?.contact_info;
      const dbContact = result.domain.contact_info;
      if (liveContact?.owner) {
        const owner = liveContact.owner;
        setContact({
          first_name: owner.first_name || '', last_name: owner.last_name || '',
          org_name: owner.org_name || '', email: owner.email || '', phone: owner.phone || '',
          address1: owner.address1 || '', address2: owner.address2 || '',
          city: owner.city || '', state: owner.state || '',
          postal_code: owner.postal_code || '', country: owner.country || 'US',
        });
      } else if (dbContact) {
        setContact({
          first_name: dbContact.first_name || '', last_name: dbContact.last_name || '',
          org_name: dbContact.org_name || '', email: dbContact.email || '', phone: dbContact.phone || '',
          address1: dbContact.address1 || '', address2: dbContact.address2 || '',
          city: dbContact.city || '', state: dbContact.state || '',
          postal_code: dbContact.postal_code || '', country: dbContact.country || 'US',
        });
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load domain');
    } finally {
      setIsLoading(false);
    }
  }, [domainId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!data?.domain) return;
    const domain = data.domain;
    if (domain.status !== 'active' || !domain.expires_at) return;
    domainsApi.getPricing(domain.domain_name)
      .then((res) => setRenewalPricing(res.pricing))
      .catch(() => { /* non-critical, silently ignore */ });
  }, [data]);

  const handleToggleAutoRenew = async () => {
    setIsTogglingAutoRenew(true);
    try {
      const newVal = !autoRenew;
      await domainsApi.setAutoRenew(domainId, newVal);
      setAutoRenew(newVal);
      addToast('success', `Auto-renew ${newVal ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to update auto-renew'));
    } finally {
      setIsTogglingAutoRenew(false);
    }
  };

  const handleToggleLock = async () => {
    setIsTogglingLock(true);
    try {
      const newVal = !domainLocked;
      await domainsApi.setLock(domainId, newVal);
      setDomainLocked(newVal);
      addToast('success', `Domain ${newVal ? 'locked' : 'unlocked'}.`);
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to update domain lock'));
    } finally {
      setIsTogglingLock(false);
    }
  };

  const handleSaveNameservers = async (e: FormEvent) => {
    e.preventDefault();
    const filtered = nameservers.filter(ns => ns.trim());
    if (filtered.length === 0) { addToast('error', 'At least one nameserver is required.'); return; }

    setIsSavingNs(true);
    try {
      await domainsApi.updateNameservers(domainId, filtered);
      addToast('success', 'Nameservers updated successfully.');
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to update nameservers'));
    } finally {
      setIsSavingNs(false);
    }
  };

  const handleWhoisSuccess = (updated: DomainContact) => {
    setContact(updated);
  };

  const addNameserverField = () => setNameservers(prev => [...prev, '']);
  const removeNameserverField = (index: number) => {
    setNameservers(prev => prev.filter((_, i) => i !== index));
  };
  const updateNameserver = (index: number, value: string) => {
    setNameservers(prev => prev.map((ns, i) => i === index ? value : ns));
  };

  const userOrgs = user?.organizations || [];

  const handleOpenZoneModal = (orgId: string, orgName: string) => {
    setSelectedOrgId(orgId);
    setSelectedOrgName(orgName);
    setIsAddZoneOpen(true);
  };

  const handleZoneCreated = (zoneId: string) => {
    setIsAddZoneOpen(false);
    router.push(`/zone/${zoneId}`);
  };

  const handleUnlink = async () => {
    setIsUnlinking(true);
    try {
      await domainsApi.unlink(domainId);
      router.push('/domains?tab=my-domains');
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to remove domain'));
      setIsUnlinking(false);
    }
  };

  const handleRenew = async () => {
    setIsRenewing(true);
    try {
      const { checkout_url } = await domainsApi.renew(domainId, selectedYears);
      window.location.href = checkout_url;
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to start renewal checkout'));
      setIsRenewing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="animate-pulse h-40 bg-gray-100 dark:bg-gray-700 rounded-lg" />
        <div className="animate-pulse h-40 bg-gray-100 dark:bg-gray-700 rounded-lg" />
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="space-y-4">
        <Link href="/domains?tab=my-domains" className="text-sm text-orange hover:text-orange/70 transition-colors">
          &larr; Back to My Domains
        </Link>
        <ErrorMessage message={loadError || 'Domain not found'} />
      </div>
    );
  }

  const { domain, zone } = data;

  const renewalTotalPrice =
    renewalPricing && renewalPricing.price > 0
      ? (renewalPricing.price * selectedYears).toFixed(2)
      : null;

  return (
    <div className="space-y-6">
      {/* Success / cancel banners from renewal redirect */}
      {renewedParam === 'true' && (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Domain renewed successfully! Your new expiration date has been updated.
          </p>
        </div>
      )}
      {renewalCancelledParam === 'true' && (
        <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
            Renewal cancelled. Your domain has not been renewed.
          </p>
        </div>
      )}

      {/* Hero Header */}
      <div className="border-l-4 border-orange bg-white dark:bg-white/[0.03] rounded-xl p-6 shadow-sm">
        <Link href="/domains?tab=my-domains" className="inline-flex items-center gap-1.5 text-sm font-medium text-orange hover:text-orange/70 transition-colors mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to My Domains
        </Link>
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold font-mono tracking-tight text-orange-dark dark:text-white">
            {domain.domain_name}
          </h1>
          <span className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${
              domain.status === 'active' ? 'bg-green-500 animate-pulse' :
              domain.status === 'pending' || domain.status === 'processing' ? 'bg-yellow-500' :
              domain.status === 'expired' || domain.status === 'failed' ? 'bg-red-500' :
              domain.status === 'transferring' ? 'bg-purple-500' :
              domain.status === 'cancelled' ? 'bg-gray-400' : 'bg-green-500'
            }`} />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">
              {domain.status === 'transfer_complete' ? 'Transferred' : domain.status}
            </span>
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
          {domain.registration_type === 'linked' ? 'Linked' : domain.registration_type === 'transfer' ? 'Transfer' : 'Registration'}
          {domain.registered_at && ` · Registered ${new Date(domain.registered_at).toLocaleDateString()}`}
          {domain.expires_at && ` · Expires ${new Date(domain.expires_at).toLocaleDateString()}`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left column: Domain Settings + Renewal */}
        <div className="space-y-6">
          {/* Domain Settings */}
      <Card title="Domain Settings">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-orange/10 dark:bg-orange/5 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-orange" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-dark dark:text-white">Auto-Renew</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically renew this domain before it expires.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleToggleAutoRenew}
                disabled={isTogglingAutoRenew}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  autoRenew ? 'bg-orange' : 'bg-gray-300 dark:bg-gray-600'
                } ${isTogglingAutoRenew ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoRenew ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
              <span className={`text-xs font-medium w-14 ${autoRenew ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                {autoRenew ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 py-3 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-orange/10 dark:bg-orange/5 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-orange" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-dark dark:text-white">Domain Lock</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Prevent unauthorized transfers of this domain.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleToggleLock}
                disabled={isTogglingLock}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  domainLocked ? 'bg-orange' : 'bg-gray-300 dark:bg-gray-600'
                } ${isTogglingLock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  domainLocked ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
              <span className={`text-xs font-medium w-14 ${domainLocked ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                {domainLocked ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

        </div>
      </Card>

          {/* Renewal */}
          {domain.status === 'active' && domain.expires_at && (
        <Card title="Renewal">
          <div className="space-y-4">
            <div className="text-center pb-4 mb-0 border-b border-gray-100 dark:border-white/5">
              {(() => {
                const daysRemaining = Math.ceil((new Date(domain.expires_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <>
                    <span className={`text-3xl font-bold ${daysRemaining < 30 ? 'text-red-500' : daysRemaining < 90 ? 'text-yellow-500' : 'text-orange'}`}>
                      {daysRemaining}
                    </span>
                    <span className="text-sm text-gray-400 dark:text-gray-500 ml-2">days remaining</span>
                  </>
                );
              })()}
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">Current expiration</p>
                <p className="text-sm font-medium text-orange-dark dark:text-white">
                  {new Date(domain.expires_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="renewal-years" className="text-sm text-gray-500 dark:text-gray-400">
                  Renew for
                </label>
                <select
                  id="renewal-years"
                  value={selectedYears}
                  onChange={(e) => setSelectedYears(Number(e.target.value))}
                  className="text-sm rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-orange-dark dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange/50"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((y) => (
                    <option key={y} value={y}>
                      {y} {y === 1 ? 'year' : 'years'}
                    </option>
                  ))}
                </select>
              </div>

              {renewalTotalPrice && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Total</span>
                  <span className="font-semibold text-orange-dark dark:text-white">
                    ${renewalTotalPrice} {renewalPricing?.currency?.toUpperCase() || 'USD'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isRenewing}
                onClick={handleRenew}
              >
                {isRenewing
                  ? 'Redirecting to checkout...'
                  : renewalTotalPrice
                  ? `Renew for $${renewalTotalPrice}`
                  : 'Renew Domain'}
              </Button>
            </div>
          </div>
        </Card>
      )}

        </div>{/* end left column */}

        {/* Right column: Nameservers */}
        <Card title="Nameservers" icon={<svg className="w-5 h-5 text-orange" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>}>
        <div className="p-3 mb-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
            Using Javelina for DNS?
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
            To use Javelina&apos;s DNS service, set your nameservers to:
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {JAVELINA_NAMESERVERS.map((ns, i) => (
              <NsCopyButton key={ns} ns={ns} index={i} />
            ))}
          </div>
        </div>

        <form onSubmit={handleSaveNameservers} className="space-y-4">
          {nameservers.map((ns, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  label={i === 0 ? 'Nameservers' : undefined}
                  placeholder={`ns${i + 1}.example.com`}
                  value={ns}
                  onChange={(e) => updateNameserver(i, e.target.value)}
                  className="font-mono"
                />
              </div>
              {nameservers.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeNameserverField(i)}
                  className="px-2 py-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={addNameserverField}
              className="text-sm text-orange hover:text-[#d46410] transition-colors"
            >
              + Add nameserver
            </button>
            <Button type="submit" variant="primary" size="sm" disabled={isSavingNs}>
              {isSavingNs ? 'Saving...' : 'Save nameservers'}
            </Button>
          </div>

        </form>
      </Card>
      </div>{/* end grid */}

      {/* WHOIS Contact — read-only display with edit modal */}
      <Card
        title="WHOIS Contact Information"
        action={
          <Button variant="secondary" size="sm" onClick={() => setIsWhoisModalOpen(true)}>
            Edit
          </Button>
        }
      >
        <div className="space-y-5">
          {/* Personal */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Personal</p>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {[
                { label: 'First Name', value: contact.first_name },
                { label: 'Last Name', value: contact.last_name },
                { label: 'Organization', value: contact.org_name, span: true },
              ].map(({ label, value, span }) => (
                <div key={label} className={span ? 'md:col-span-2' : undefined}>
                  <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</dt>
                  <dd className="text-sm font-medium text-orange-dark dark:text-white">
                    {value || <span className="text-gray-300 dark:text-gray-600">&mdash;</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          {/* Contact */}
          <div className="border-t border-gray-100 dark:border-white/5 pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Contact</p>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {[
                { label: 'Email', value: contact.email },
                { label: 'Phone', value: contact.phone },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</dt>
                  <dd className="text-sm font-medium text-orange-dark dark:text-white">
                    {value || <span className="text-gray-300 dark:text-gray-600">&mdash;</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          {/* Address */}
          <div className="border-t border-gray-100 dark:border-white/5 pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Address</p>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {[
                { label: 'Address', value: [contact.address1, contact.address2].filter(Boolean).join(', '), span: true },
                { label: 'City', value: contact.city },
                { label: 'State', value: contact.state },
                { label: 'ZIP / Postal Code', value: contact.postal_code },
                { label: 'Country', value: contact.country },
              ].map(({ label, value, span }) => (
                <div key={label} className={(span as boolean) ? 'md:col-span-2' : undefined}>
                  <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</dt>
                  <dd className="text-sm font-medium text-orange-dark dark:text-white">
                    {value || <span className="text-gray-300 dark:text-gray-600">&mdash;</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Card>

      {/* DNS Zone */}
      <Card title="DNS Zone">
        {zone ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-dark dark:text-white font-medium">{zone.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Organization: {zone.organization_name}
              </p>
            </div>
            <Link
              href={`/zone/${zone.id}`}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-orange hover:bg-[#d46410] rounded-md transition-colors"
            >
              Manage DNS records
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              No DNS zone exists for this domain yet. Create one to manage DNS records in Javelina.
            </p>
            {userOrgs.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                  Select an organization
                </p>
                {userOrgs
                  .slice((orgPage - 1) * ORG_PAGE_SIZE, orgPage * ORG_PAGE_SIZE)
                  .map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleOpenZoneModal(org.id, org.name)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-light dark:border-gray-700 hover:border-orange dark:hover:border-orange hover:shadow-md transition-all flex items-center justify-between group"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-orange/10 text-orange text-sm font-bold flex items-center justify-center flex-shrink-0">
                        {org.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-orange-dark dark:text-white">{org.name}</span>
                    </span>
                    <span className="text-xs font-medium text-orange group-hover:translate-x-0.5 transition-transform">Set up DNS &rarr;</span>
                  </button>
                ))}
                <Pagination
                  currentPage={orgPage}
                  totalPages={Math.ceil(userOrgs.length / ORG_PAGE_SIZE)}
                  onPageChange={setOrgPage}
                  totalItems={userOrgs.length}
                  itemsPerPage={ORG_PAGE_SIZE}
                />
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You need to create an organization first to set up DNS.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* SSL Certificates */}
      {!hideSslCertificates && <DomainCertificatesSection domainName={domain.domain_name} />}

      {/* Remove from Javelina (linked domains only) */}
      {domain.registration_type === 'linked' && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 p-6">
          <h3 className="text-base font-semibold text-red-700 dark:text-red-400">
            Remove Domain
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            This domain was linked from the OpenSRS Storefront. Removing it will only detach it from
            your Javelina account&mdash;your domain registration with OpenSRS is not affected and you
            can re-link it at any time.
          </p>

          <button
            onClick={() => setShowUnlinkConfirm(true)}
            className="mt-4 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            Remove from Javelina
          </button>

          <ConfirmationModal
            isOpen={showUnlinkConfirm}
            onClose={() => setShowUnlinkConfirm(false)}
            onConfirm={handleUnlink}
            title="Remove Domain"
            message={`Are you sure you want to remove ${domain.domain_name} from your Javelina account? Your domain registration with OpenSRS is not affected and you can re-link it at any time.`}
            confirmText="Remove Domain"
            cancelText="Keep Domain"
            variant="danger"
            isLoading={isUnlinking}
          />
        </div>
      )}

      {/* WHOIS Edit Modal */}
      <EditWhoisModal
        isOpen={isWhoisModalOpen}
        onClose={() => setIsWhoisModalOpen(false)}
        domainId={domainId}
        initialContact={contact}
        onSuccess={handleWhoisSuccess}
      />

      {/* Add Zone Modal */}
      {selectedOrgId && (
        <AddZoneModal
          isOpen={isAddZoneOpen}
          onClose={() => setIsAddZoneOpen(false)}
          organizationId={selectedOrgId}
          organizationName={selectedOrgName}
          onSuccess={handleZoneCreated}
        />
      )}
    </div>
  );
}
