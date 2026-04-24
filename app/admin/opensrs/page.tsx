'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { adminApi } from '@/lib/api-client';
import type { MailboxPricingAdminTier } from '@/types/mailbox';
import { useToastStore } from '@/lib/toast-store';
import Dropdown from '@/components/ui/Dropdown';

interface DomainTransaction {
  id: string;
  domain_name: string;
  tld: string;
  registration_type: string;
  status: string;
  opensrs_order_id: string | null;
  opensrs_transfer_id: string | null;
  amount_paid: number | null;
  currency: string;
  registered_at: string | null;
  expires_at: string | null;
  years: number;
  auto_renew: boolean;
  user_id: string;
  user_name: string;
  user_email: string;
  created_at: string;
}

interface TldPricing {
  tld: string;
  wholesale_registration: number;
  wholesale_renewal: number;
  wholesale_transfer: number;
  sale_registration: number | null;
  sale_renewal: number | null;
  sale_transfer: number | null;
  margin_override: number | null;
  is_active: boolean;
  global_margin: number;
  effective_margin: number;
  computed_registration: number;
  computed_renewal: number;
  computed_transfer: number;
  has_margin_override: boolean;
  has_sale_override_registration: boolean;
  has_sale_override_renewal: boolean;
  has_sale_override_transfer: boolean;
}

type SortKey = 'domain_name' | 'registration_type' | 'status' | 'amount_paid' | 'expires_at' | 'registered_at' | 'user_email';
type SortDirection = 'asc' | 'desc';

const TABS = [
  { id: 'transaction-log', label: 'Transaction Log' },
  { id: 'tld-pricing', label: 'TLD Pricing' },
  { id: 'mailbox-pricing', label: 'Mailbox Pricing' },
] as const;

type TabId = typeof TABS[number]['id'];

function formatCurrency(amountCents: number | null, currency: string): string {
  if (amountCents === null || amountCents === undefined) return '—';
  const amount = amountCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isExpiringSoon(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const expires = new Date(dateStr);
  const now = new Date();
  const daysUntilExpiry = (expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function RegistrationTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    new: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    transfer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    linked: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
      {status}
    </span>
  );
}

function SortableHeader({
  label,
  sortKey: key,
  currentSortKey,
  sortDirection,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentSortKey: SortKey | null;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentSortKey === key;
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-accent transition-colors select-none"
      onClick={() => onSort(key)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            {sortDirection === 'asc' ? (
              <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" />
            ) : (
              <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" />
            )}
          </svg>
        )}
      </div>
    </th>
  );
}

export default function AdminOpenSRSPage() {
  const [activeTab, setActiveTab] = useState<TabId>('transaction-log');
  const [domains, setDomains] = useState<DomainTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey | null>('registered_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { addToast } = useToastStore();

  // TLD Pricing state
  const [tldPricingData, setTldPricingData] = useState<TldPricing[]>([]);
  const [tldLoading, setTldLoading] = useState(false);
  const [globalMargin, setGlobalMargin] = useState<number>(30);
  const [editingMargin, setEditingMargin] = useState<string>('30');
  const [tldSearch, setTldSearch] = useState('');
  const [tldPage, setTldPage] = useState(1);
  const [editingTld, setEditingTld] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    margin_override: string;
    sale_registration: string;
    sale_renewal: string;
    sale_transfer: string;
  }>({ margin_override: '', sale_registration: '', sale_renewal: '', sale_transfer: '' });

  // Mailbox Pricing state
  const [mailboxTiers, setMailboxTiers] = useState<MailboxPricingAdminTier[]>([]);
  const [mailboxLoading, setMailboxLoading] = useState(false);
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [tierEdits, setTierEdits] = useState<{
    margin_percent: number;
    sale_price_override: string;
    mailbox_limit: number;
    is_active: boolean;
  }>({ margin_percent: 50, sale_price_override: '', mailbox_limit: 0, is_active: true });
  const [seeding, setSeeding] = useState(false);
  const tldPageSize = 10;

  const fetchDomains = useCallback(async () => {
    try {
      const data = await adminApi.listDomains();
      setDomains((data || []) as DomainTransaction[]);
    } catch (error: any) {
      addToast('error', error.message || 'Failed to fetch domains');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const fetchTldPricing = useCallback(async () => {
    setTldLoading(true);
    try {
      const data = await adminApi.listTldPricing();
      setTldPricingData(data.tlds || []);
      setGlobalMargin(data.global_margin ?? 30);
      setEditingMargin(String(data.global_margin ?? 30));
    } catch (error: any) {
      addToast('error', error.message || 'Failed to fetch TLD pricing');
    } finally {
      setTldLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (activeTab === 'tld-pricing' && tldPricingData.length === 0 && !tldLoading) {
      fetchTldPricing();
    }
  }, [activeTab, tldPricingData.length, tldLoading, fetchTldPricing]);

  // Mailbox pricing fetch
  const fetchMailboxPricing = useCallback(async () => {
    setMailboxLoading(true);
    try {
      const data = await adminApi.listMailboxPricing();
      setMailboxTiers(data.tiers);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to fetch mailbox pricing');
    } finally {
      setMailboxLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (activeTab === 'mailbox-pricing' && mailboxTiers.length === 0 && !mailboxLoading) {
      fetchMailboxPricing();
    }
  }, [activeTab, mailboxTiers.length, mailboxLoading, fetchMailboxPricing]);

  const handleStartTierEdit = (tier: MailboxPricingAdminTier) => {
    setEditingTier(tier.id);
    setTierEdits({
      margin_percent: tier.margin_percent,
      sale_price_override: tier.sale_price_override !== null ? tier.sale_price_override.toString() : '',
      mailbox_limit: tier.mailbox_limit,
      is_active: tier.is_active,
    });
  };

  const handleSaveTierEdit = async () => {
    if (!editingTier) return;
    try {
      await adminApi.updateMailboxPricing(editingTier, {
        margin_percent: tierEdits.margin_percent,
        sale_price_override: tierEdits.sale_price_override ? parseFloat(tierEdits.sale_price_override) : null,
        mailbox_limit: tierEdits.mailbox_limit,
        is_active: tierEdits.is_active,
      });
      addToast('success', 'Mailbox pricing updated.');
      setEditingTier(null);
      await fetchMailboxPricing();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update pricing');
    }
  };

  const handleToggleTierActive = async (tierId: string, currentActive: boolean) => {
    try {
      await adminApi.updateMailboxPricing(tierId, { is_active: !currentActive });
      addToast('success', `Tier ${currentActive ? 'deactivated' : 'activated'}.`);
      await fetchMailboxPricing();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to toggle tier');
    }
  };

  const handleSaveGlobalMargin = async () => {
    const margin = parseFloat(editingMargin);
    if (isNaN(margin) || margin < 0 || margin > 1000) {
      addToast('error', 'Margin must be between 0 and 1000');
      return;
    }
    try {
      await adminApi.updateGlobalMargin(margin);
      addToast('success', `Global margin updated to ${margin}%`);
      await fetchTldPricing();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to update global margin');
    }
  };

  const handleStartEdit = (tld: TldPricing) => {
    setEditingTld(tld.tld);
    setEditForm({
      margin_override: tld.margin_override !== null ? String(tld.margin_override) : '',
      sale_registration: tld.sale_registration !== null ? String(tld.sale_registration) : '',
      sale_renewal: tld.sale_renewal !== null ? String(tld.sale_renewal) : '',
      sale_transfer: tld.sale_transfer !== null ? String(tld.sale_transfer) : '',
    });
  };

  const handleSaveTld = async () => {
    if (!editingTld) return;
    try {
      const updates: Record<string, any> = {};
      updates.margin_override = editForm.margin_override ? parseFloat(editForm.margin_override) : null;
      updates.sale_registration = editForm.sale_registration ? parseFloat(editForm.sale_registration) : null;
      updates.sale_renewal = editForm.sale_renewal ? parseFloat(editForm.sale_renewal) : null;
      updates.sale_transfer = editForm.sale_transfer ? parseFloat(editForm.sale_transfer) : null;
      await adminApi.updateTldPricing(editingTld, updates);
      addToast('success', `Pricing updated for ${editingTld}`);
      setEditingTld(null);
      await fetchTldPricing();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to update TLD pricing');
    }
  };

  const handleSeedPricing = async () => {
    setSeeding(true);
    try {
      const result = await adminApi.seedTldPricing();
      addToast('success', `Seeded ${result.succeeded}/${result.total} TLDs. ${result.failed} failed.`);
      await fetchTldPricing();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to seed pricing');
    } finally {
      setSeeding(false);
    }
  };

  const handleToggleActive = async (tld: string, isActive: boolean) => {
    try {
      await adminApi.updateTldPricing(tld, { is_active: !isActive });
      await fetchTldPricing();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to toggle TLD');
    }
  };

  const filteredDomains = useMemo(() => {
    let filtered = domains;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((d) =>
        d.domain_name.toLowerCase().includes(query) ||
        d.user_email.toLowerCase().includes(query) ||
        d.user_name.toLowerCase().includes(query) ||
        d.opensrs_order_id?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((d) => d.registration_type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((d) => d.status === statusFilter);
    }

    // Sorting
    if (sortKey) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any = a[sortKey];
        let bVal: any = b[sortKey];

        // Handle nulls
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        // Handle dates
        if (sortKey === 'registered_at' || sortKey === 'expires_at') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }

        // Handle numbers
        if (sortKey === 'amount_paid') {
          aVal = aVal || 0;
          bVal = bVal || 0;
        }

        // Handle strings
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal as string).toLowerCase();
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [domains, searchQuery, typeFilter, statusFilter, sortKey, sortDirection]);

  const totalPages = Math.ceil(filteredDomains.length / pageSize);
  const paginatedDomains = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDomains.slice(start, start + pageSize);
  }, [filteredDomains, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, statusFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const filteredTlds = useMemo(() => {
    if (!tldSearch.trim()) return tldPricingData;
    const q = tldSearch.toLowerCase();
    return tldPricingData.filter((t) => t.tld.toLowerCase().includes(q));
  }, [tldPricingData, tldSearch]);

  const tldTotalPages = Math.ceil(filteredTlds.length / tldPageSize);
  const paginatedTlds = useMemo(() => {
    const start = (tldPage - 1) * tldPageSize;
    return filteredTlds.slice(start, start + tldPageSize);
  }, [filteredTlds, tldPage]);

  useEffect(() => {
    setTldPage(1);
  }, [tldSearch]);

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-text">OpenSRS Config</h1>

          {/* Tab Navigation */}
          <div className="border-b border-border">
            <nav className="flex gap-4">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-accent text-accent'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Transaction Log Tab */}
          {activeTab === 'transaction-log' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search domains, users, order IDs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-surface text-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
                <Dropdown
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'new', label: 'New' },
                    { value: 'transfer', label: 'Transfer' },
                    { value: 'linked', label: 'Linked' },
                  ]}
                  className="sm:w-44"
                />
                <Dropdown
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'active', label: 'Active' },
                    { value: 'pending', label: 'Pending' },
                  ]}
                  className="sm:w-44"
                />
              </div>

              {/* Results count */}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredDomains.length)}–{Math.min(currentPage * pageSize, filteredDomains.length)} of {filteredDomains.length} domain{filteredDomains.length !== 1 ? 's' : ''}
                {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all') && ` (filtered from ${domains.length})`}
              </p>

              {/* Table */}
              <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <SortableHeader label="Domain" sortKey="domain_name" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader label="Action" sortKey="registration_type" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader label="Status" sortKey="status" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader label="Cost" sortKey="amount_paid" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader label="Registered" sortKey="registered_at" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader label="Valid Until" sortKey="expires_at" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader label="User" sortKey="user_email" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Order ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 8 }).map((_, j) => (
                              <td key={j} className="px-4 py-3">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : filteredDomains.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            {domains.length === 0 ? 'No domains found.' : 'No domains match your filters.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedDomains.map((domain) => (
                          <tr key={domain.id} className="hover:bg-surface-hover/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-text">
                              {domain.domain_name}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <RegistrationTypeBadge type={domain.registration_type} />
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <StatusBadge status={domain.status} />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {formatCurrency(domain.amount_paid, domain.currency)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {formatDate(domain.registered_at)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={
                                  isExpired(domain.expires_at)
                                    ? 'text-red-600 dark:text-red-400 font-medium'
                                    : isExpiringSoon(domain.expires_at)
                                    ? 'text-yellow-600 dark:text-yellow-400 font-medium'
                                    : 'text-gray-700 dark:text-gray-300'
                                }
                              >
                                {formatDate(domain.expires_at)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              <div>{domain.user_name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{domain.user_email}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono text-xs">
                              {domain.opensrs_order_id || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-surface text-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-hover transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-surface text-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-hover transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TLD Pricing Tab */}
          {activeTab === 'tld-pricing' && (
            <div className="space-y-4">
              {/* Global Margin Control */}
              <div className="bg-surface rounded-xl shadow-sm border border-border p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-text">Global Margin</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Applied to all TLDs without a per-TLD override</p>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <input
                      type="number"
                      value={editingMargin}
                      onChange={(e) => setEditingMargin(e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-surface dark:bg-gray-700 text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                      min="0"
                      max="1000"
                      step="0.1"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                    <button
                      onClick={handleSaveGlobalMargin}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search TLDs..."
                    value={tldSearch}
                    onChange={(e) => setTldSearch(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-surface text-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleSeedPricing}
                  disabled={seeding}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-surface text-text hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {seeding ? 'Fetching Prices...' : 'Refresh Wholesale Prices'}
                </button>
              </div>

              {/* Results count */}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {Math.min((tldPage - 1) * tldPageSize + 1, filteredTlds.length)}–{Math.min(tldPage * tldPageSize, filteredTlds.length)} of {filteredTlds.length} TLD{filteredTlds.length !== 1 ? 's' : ''}
              </p>

              {/* TLD Table */}
              <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">TLD</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Wholesale (Reg / Renew / Xfer)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Margin %</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sale Price (Reg / Renew / Xfer)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {tldLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 6 }).map((_, j) => (
                              <td key={j} className="px-4 py-3">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : paginatedTlds.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            {tldPricingData.length === 0 ? 'No TLD pricing data. Click "Refresh Wholesale Prices" to seed.' : 'No TLDs match your search.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedTlds.map((tld) => (
                          <tr key={tld.tld} className="hover:bg-surface-hover/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-text">
                              {tld.tld}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono">
                              ${tld.wholesale_registration.toFixed(2)} / ${tld.wholesale_renewal.toFixed(2)} / ${tld.wholesale_transfer.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={tld.has_margin_override ? 'text-accent font-medium' : 'text-gray-700 dark:text-gray-300'}>
                                {tld.effective_margin}%
                              </span>
                              {tld.has_margin_override && (
                                <span className="ml-1 text-xs text-accent">(override)</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono">
                              <span className={tld.has_sale_override_registration ? 'text-accent font-medium' : 'text-gray-700 dark:text-gray-300'}>
                                ${tld.computed_registration.toFixed(2)}
                              </span>
                              {' / '}
                              <span className={tld.has_sale_override_renewal ? 'text-accent font-medium' : 'text-gray-700 dark:text-gray-300'}>
                                ${tld.computed_renewal.toFixed(2)}
                              </span>
                              {' / '}
                              <span className={tld.has_sale_override_transfer ? 'text-accent font-medium' : 'text-gray-700 dark:text-gray-300'}>
                                ${tld.computed_transfer.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => handleToggleActive(tld.tld, tld.is_active)}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  tld.is_active
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                              >
                                {tld.is_active ? 'Yes' : 'No'}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {editingTld === tld.tld ? (
                                <div className="flex gap-1">
                                  <button onClick={handleSaveTld} className="text-green-600 hover:text-green-800 text-xs font-medium">Save</button>
                                  <button onClick={() => setEditingTld(null)} className="text-gray-500 hover:text-gray-700 text-xs font-medium">Cancel</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleStartEdit(tld)}
                                  className="text-accent hover:text-accent/80 text-xs font-medium"
                                >
                                  Edit
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Edit Panel */}
              {editingTld && (
                <div className="bg-surface rounded-xl shadow-sm border border-accent/50 p-4">
                  <h3 className="text-sm font-medium text-text mb-3">Editing {editingTld}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Margin Override (%)</label>
                      <input
                        type="number"
                        value={editForm.margin_override}
                        onChange={(e) => setEditForm({ ...editForm, margin_override: e.target.value })}
                        placeholder={`Global: ${globalMargin}%`}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-surface dark:bg-gray-700 text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sale Override (Registration)</label>
                      <input
                        type="number"
                        value={editForm.sale_registration}
                        onChange={(e) => setEditForm({ ...editForm, sale_registration: e.target.value })}
                        placeholder="Auto from margin"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-surface dark:bg-gray-700 text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sale Override (Renewal)</label>
                      <input
                        type="number"
                        value={editForm.sale_renewal}
                        onChange={(e) => setEditForm({ ...editForm, sale_renewal: e.target.value })}
                        placeholder="Auto from margin"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-surface dark:bg-gray-700 text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sale Override (Transfer)</label>
                      <input
                        type="number"
                        value={editForm.sale_transfer}
                        onChange={(e) => setEditForm({ ...editForm, sale_transfer: e.target.value })}
                        placeholder="Auto from margin"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-surface dark:bg-gray-700 text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Leave fields empty to use the global margin calculation. Setting a sale price override takes precedence over margin.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleSaveTld}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditingTld(null)}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-surface-hover transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {tldTotalPages > 1 && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setTldPage((p) => Math.max(1, p - 1))}
                    disabled={tldPage === 1}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-surface text-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-hover transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Page {tldPage} of {tldTotalPages}
                  </span>
                  <button
                    onClick={() => setTldPage((p) => Math.min(tldTotalPages, p + 1))}
                    disabled={tldPage === tldTotalPages}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-surface text-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-hover transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'mailbox-pricing' && (
            <div className="space-y-4">
              <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tier</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Storage</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">OpenSRS Cost</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Margin %</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sale Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mailbox Limit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {mailboxLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 8 }).map((_, j) => (
                              <td key={j} className="px-4 py-3">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        mailboxTiers.map((tier) => (
                          <tr key={tier.id} className="hover:bg-surface-hover/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-text">{tier.tier_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{tier.storage_gb}GB</td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono">${tier.opensrs_cost.toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{tier.margin_percent}%</td>
                            <td className="px-4 py-3 text-sm font-mono">
                              <span className={tier.has_sale_override ? 'text-accent font-medium' : 'text-gray-700 dark:text-gray-300'}>
                                ${tier.computed_price.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {tier.mailbox_limit === 0 ? 'Unlimited' : tier.mailbox_limit}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => handleToggleTierActive(tier.id, tier.is_active)}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  tier.is_active
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                              >
                                {tier.is_active ? 'Yes' : 'No'}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {editingTier === tier.id ? (
                                <div className="flex gap-1">
                                  <button onClick={handleSaveTierEdit} className="text-green-600 text-xs font-medium hover:underline">Save</button>
                                  <button onClick={() => setEditingTier(null)} className="text-gray-500 text-xs font-medium hover:underline">Cancel</button>
                                </div>
                              ) : (
                                <button onClick={() => handleStartTierEdit(tier)} className="text-accent text-xs font-medium hover:underline">Edit</button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {editingTier && (
                <div className="bg-surface rounded-xl shadow-sm border border-border p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Margin %</label>
                      <input
                        type="number"
                        value={tierEdits.margin_percent}
                        onChange={(e) => setTierEdits({ ...tierEdits, margin_percent: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Sale Price Override ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={tierEdits.sale_price_override}
                        onChange={(e) => setTierEdits({ ...tierEdits, sale_price_override: e.target.value })}
                        placeholder="Auto from margin"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Mailbox Limit (0 = unlimited)</label>
                      <input
                        type="number"
                        value={tierEdits.mailbox_limit}
                        onChange={(e) => setTierEdits({ ...tierEdits, mailbox_limit: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button onClick={handleSaveTierEdit} className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors">Save</button>
                      <button onClick={() => setEditingTier(null)} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-surface-hover transition-colors">Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
