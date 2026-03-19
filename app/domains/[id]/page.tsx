'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { domainsApi } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { AddZoneModal } from '@/components/modals/AddZoneModal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import type {
  Domain,
  DomainManagementResponse,
  DomainContact,
} from '@/types/domains';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

const JAVELINA_NAMESERVERS = ['ns1.javelina.cc', 'ns2.javelina.me'];

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

function SuccessMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
      <p className="text-sm text-green-700 dark:text-green-400">{message}</p>
    </div>
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
  const { user } = useAuthStore();
  const domainId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DomainManagementResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Settings state
  const [autoRenew, setAutoRenew] = useState(false);
  const [isTogglingAutoRenew, setIsTogglingAutoRenew] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const [domainLocked, setDomainLocked] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Nameservers state
  const [nameservers, setNameservers] = useState<string[]>(['', '']);
  const [isSavingNs, setIsSavingNs] = useState(false);
  const [nsMessage, setNsMessage] = useState<string | null>(null);
  const [nsError, setNsError] = useState<string | null>(null);

  // Contact state
  const [contact, setContact] = useState<DomainContact>({
    first_name: '', last_name: '', org_name: '', email: '', phone: '',
    address1: '', address2: '', city: '', state: '', postal_code: '', country: 'US',
  });
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  // Zone modal state
  const [isAddZoneOpen, setIsAddZoneOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedOrgName, setSelectedOrgName] = useState('');

  // Unlink state
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const result = await domainsApi.getManagement(domainId);
      setData(result);

      setAutoRenew(result.domain.auto_renew || false);

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

  const handleToggleAutoRenew = async () => {
    setIsTogglingAutoRenew(true);
    setSettingsMessage(null);
    setSettingsError(null);
    try {
      const newVal = !autoRenew;
      await domainsApi.setAutoRenew(domainId, newVal);
      setAutoRenew(newVal);
      setSettingsMessage(`Auto-renew ${newVal ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      setSettingsError(extractErrorMessage(err, 'Failed to update auto-renew'));
    } finally {
      setIsTogglingAutoRenew(false);
    }
  };

  const handleToggleLock = async () => {
    setIsTogglingLock(true);
    setSettingsMessage(null);
    setSettingsError(null);
    try {
      const newVal = !domainLocked;
      await domainsApi.setLock(domainId, newVal);
      setDomainLocked(newVal);
      setSettingsMessage(`Domain ${newVal ? 'locked' : 'unlocked'}.`);
    } catch (err: any) {
      setSettingsError(extractErrorMessage(err, 'Failed to update domain lock'));
    } finally {
      setIsTogglingLock(false);
    }
  };

  const handleSaveNameservers = async (e: FormEvent) => {
    e.preventDefault();
    const filtered = nameservers.filter(ns => ns.trim());
    if (filtered.length === 0) { setNsError('At least one nameserver is required.'); return; }

    setIsSavingNs(true);
    setNsMessage(null);
    setNsError(null);
    try {
      await domainsApi.updateNameservers(domainId, filtered);
      setNsMessage('Nameservers updated successfully.');
    } catch (err: any) {
      setNsError(extractErrorMessage(err, 'Failed to update nameservers'));
    } finally {
      setIsSavingNs(false);
    }
  };

  const handleSaveContact = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingContact(true);
    setContactMessage(null);
    setContactError(null);
    try {
      await domainsApi.updateContacts(domainId, contact);
      setContactMessage('Contact information updated successfully.');
    } catch (err: any) {
      setContactError(extractErrorMessage(err, 'Failed to update contacts'));
    } finally {
      setIsSavingContact(false);
    }
  };

  const updateContact = (field: keyof DomainContact, value: string) => {
    setContact(prev => ({ ...prev, [field]: value }));
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
    setUnlinkError(null);
    try {
      await domainsApi.unlink(domainId);
      router.push('/domains/my-domains');
    } catch (err: any) {
      setUnlinkError(extractErrorMessage(err, 'Failed to remove domain'));
      setIsUnlinking(false);
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
        <Link href="/domains/my-domains" className="text-sm text-orange hover:text-orange-dark transition-colors">
          &larr; Back to My Domains
        </Link>
        <ErrorMessage message={loadError || 'Domain not found'} />
      </div>
    );
  }

  const { domain, zone } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/domains/my-domains" className="text-sm text-orange hover:text-orange-dark transition-colors">
          &larr; Back to My Domains
        </Link>
        <div className="mt-3 flex items-center gap-4">
          <h1 className="text-2xl font-bold text-orange-dark dark:text-white">
            {domain.domain_name}
          </h1>
          <StatusBadge status={domain.status} />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {domain.registration_type === 'linked' ? 'Linked' : domain.registration_type === 'transfer' ? 'Transfer' : 'Registration'}
          {domain.registered_at && ` · Registered ${new Date(domain.registered_at).toLocaleDateString()}`}
          {domain.expires_at && ` · Expires ${new Date(domain.expires_at).toLocaleDateString()}`}
        </p>
      </div>

      {/* Domain Settings */}
      <Card title="Domain Settings">
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-light dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-orange-dark dark:text-white">Auto-Renew</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Automatically renew this domain before it expires.
              </p>
            </div>
            <button
              onClick={handleToggleAutoRenew}
              disabled={isTogglingAutoRenew}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoRenew ? 'bg-orange' : 'bg-gray-300 dark:bg-gray-600'
              } ${isTogglingAutoRenew ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoRenew ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-orange-dark dark:text-white">Domain Lock</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Prevent unauthorized transfers of this domain. Changes may take a few minutes to propagate.
              </p>
            </div>
            <button
              onClick={handleToggleLock}
              disabled={isTogglingLock}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                domainLocked ? 'bg-orange' : 'bg-gray-300 dark:bg-gray-600'
              } ${isTogglingLock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                domainLocked ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <SuccessMessage message={settingsMessage} />
          <ErrorMessage message={settingsError} />
        </div>
      </Card>

      {/* Nameservers */}
      <Card title="Nameservers">
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
              className="text-sm text-orange hover:text-orange-dark transition-colors"
            >
              + Add nameserver
            </button>
            <Button type="submit" variant="primary" size="sm" disabled={isSavingNs}>
              {isSavingNs ? 'Saving...' : 'Save nameservers'}
            </Button>
          </div>

          <SuccessMessage message={nsMessage} />
          <ErrorMessage message={nsError} />
        </form>
      </Card>

      {/* WHOIS Contact */}
      <Card title="WHOIS Contact Information">
        <form onSubmit={handleSaveContact} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="First Name" value={contact.first_name} onChange={(e) => updateContact('first_name', e.target.value)} required />
            <Input label="Last Name" value={contact.last_name} onChange={(e) => updateContact('last_name', e.target.value)} required />
            <Input label="Organization (optional)" value={contact.org_name || ''} onChange={(e) => updateContact('org_name', e.target.value)} className="md:col-span-2" />
            <Input label="Email" type="email" value={contact.email} onChange={(e) => updateContact('email', e.target.value)} required />
            <Input label="Phone" placeholder="(555) 123-4567" value={contact.phone} onChange={(e) => updateContact('phone', e.target.value)} required />
            <Input label="Address" value={contact.address1} onChange={(e) => updateContact('address1', e.target.value)} required className="md:col-span-2" />
            <Input label="Address Line 2 (optional)" value={contact.address2 || ''} onChange={(e) => updateContact('address2', e.target.value)} className="md:col-span-2" />
            <Input label="City" value={contact.city} onChange={(e) => updateContact('city', e.target.value)} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">State</label>
              <select
                value={contact.state}
                onChange={(e) => updateContact('state', e.target.value)}
                required
                className="w-full rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-700 text-orange-dark dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange"
              >
                <option value="">Select state</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Input label="ZIP / Postal Code" value={contact.postal_code} onChange={(e) => updateContact('postal_code', e.target.value)} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Country</label>
              <select
                value={contact.country}
                onChange={(e) => updateContact('country', e.target.value)}
                required
                className="w-full rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-700 text-orange-dark dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" size="sm" disabled={isSavingContact}>
              {isSavingContact ? 'Saving...' : 'Save contact info'}
            </Button>
          </div>

          <SuccessMessage message={contactMessage} />
          <ErrorMessage message={contactError} />
        </form>
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
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-orange hover:bg-orange-dark rounded-md transition-colors"
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
                {userOrgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleOpenZoneModal(org.id, org.name)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-light dark:border-gray-700 hover:border-orange dark:hover:border-orange hover:shadow-md transition-all flex items-center justify-between"
                  >
                    <span className="text-sm font-medium text-orange-dark dark:text-white">{org.name}</span>
                    <span className="text-xs text-orange">Set up DNS &rarr;</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You need to create an organization first to set up DNS.
              </p>
            )}
          </div>
        )}
      </Card>

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

          {unlinkError && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{unlinkError}</p>
            </div>
          )}

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
