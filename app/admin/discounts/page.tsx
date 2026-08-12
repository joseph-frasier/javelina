'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Modal } from '@/components/ui/Modal';
import { Tooltip } from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { Pagination } from '@/components/admin/Pagination';
import CreateDiscountCodeModal from '@/components/modals/CreateDiscountCodeModal';
import {
  discountsApi,
  type DiscountCodeWithRules,
  type DiscountCodeRedemption,
} from '@/lib/api-client';
import { summarizeRules, summarizeDuration } from '@/lib/discounts/format';
import { useToastStore } from '@/lib/stores/toast-store';
import { formatDateWithRelative, formatExpirationDate } from '@/lib/utils/time';

type DiscountStatusVariant = 'success' | 'warning' | 'danger' | 'neutral';

function getDiscountStatus(code: DiscountCodeWithRules): {
  label: string;
  variant: DiscountStatusVariant;
} {
  if (!code.is_active) return { label: 'Inactive', variant: 'neutral' };
  if (code.redeemable_until && new Date(code.redeemable_until) < new Date()) {
    return { label: 'Expired', variant: 'danger' };
  }
  // redeem_discount_code raises 'expired' for this too — a code whose grant
  // window has closed would grant rules that expire the moment they are written.
  if (code.grant_ends_at && new Date(code.grant_ends_at) < new Date()) {
    return { label: 'Expired', variant: 'danger' };
  }
  if (code.max_redemptions != null && code.times_redeemed >= code.max_redemptions) {
    return { label: 'Limit Reached', variant: 'warning' };
  }
  return { label: 'Active', variant: 'success' };
}

function RedemptionsModal({
  code,
  onClose,
}: {
  code: DiscountCodeWithRules | null;
  onClose: () => void;
}) {
  const addToast = useToastStore((s) => s.addToast);
  const [redemptions, setRedemptions] = useState<DiscountCodeRedemption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    setLoading(true);
    discountsApi
      .redemptions(code.id)
      .then((data) => {
        if (!cancelled) setRedemptions(data.redemptions || []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          addToast('error', err instanceof Error ? err.message : 'Failed to load redemptions');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- addToast identity is unstable across renders; only code.id should trigger a refetch
  }, [code?.id]);

  return (
    <Modal
      isOpen={code !== null}
      onClose={onClose}
      title={code ? `Redemptions for ${code.code}` : 'Redemptions'}
      size="medium"
    >
      {loading ? (
        <p className="text-gray-slate">Loading&hellip;</p>
      ) : redemptions.length === 0 ? (
        <p className="text-gray-slate">No organizations have redeemed this code yet.</p>
      ) : (
        <ul className="space-y-2">
          {redemptions.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-3"
            >
              <span className="font-medium text-text">{r.organizations?.name || r.org_id}</span>
              <span className="text-sm text-gray-slate">
                {formatDateWithRelative(r.redeemed_at).relative}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function AdminDiscountsPageContent() {
  const searchParams = useSearchParams();
  const { addToast } = useToastStore();
  const [codes, setCodes] = useState<DiscountCodeWithRules[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [redemptionsTarget, setRedemptionsTarget] = useState<DiscountCodeWithRules | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Mobile-only pagination (desktop pagination lives inside AdminDataTable)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const [deactivateTarget, setDeactivateTarget] = useState<DiscountCodeWithRules | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    try {
      const data = await discountsApi.list();
      setCodes(data.codes || []);
    } catch (error) {
      console.error('Failed to fetch discount codes:', error);
      setCodes([]);
      addToast('error', 'Failed to load discount codes');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  useEffect(() => {
    const search = searchParams.get('search');
    if (search !== null) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowSkeleton(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(false);
    }
  }, [loading]);

  // Filtering and paging happen in the browser over the full result set:
  // discountsApi.list() takes no params and the backend's listCodes() is
  // deliberately unbounded. That is a considered choice, not an oversight —
  // codes are hand-created by superadmins in a modal, there is no bulk import
  // and no customer-facing way to create one, so the table grows by a handful
  // per year (prod holds 3). Restoring server-side paging means route params,
  // a count query, and reworking the rules join on both sides.
  //
  // Revisit if this list passes a few hundred rows: at that point the unbounded
  // fetch is a slow page with no signal that anything is wrong.
  const filteredCodes = codes.filter((code) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return code.code.toLowerCase().includes(query);
    }
    return true;
  });

  // Reset mobile pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredCodes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCodes = filteredCodes.slice(startIndex, startIndex + itemsPerPage);

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    const id = deactivateTarget.id;
    setActioningId(id);
    try {
      await discountsApi.deactivate(id);
      addToast('success', 'Discount code deactivated');
      setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: false } : c)));
      setDeactivateTarget(null);
    } catch (error: unknown) {
      addToast('error', error instanceof Error ? error.message : 'Failed to deactivate code');
    } finally {
      setActioningId(null);
    }
  };

  const columns: AdminDataTableColumn<DiscountCodeWithRules>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'Code',
        sortValue: (c) => c.code.toLowerCase(),
        render: (c) => (
          <div>
            <p className="font-mono font-bold text-text">{c.code}</p>
            {c.description && <p className="text-xs text-text-faint">{c.description}</p>}
          </div>
        ),
      },
      {
        key: 'grants',
        header: 'Grants',
        sortable: false,
        render: (c) => (
          <p className="text-green-600 dark:text-green-400 font-medium">{summarizeRules(c.rules)}</p>
        ),
      },
      {
        key: 'duration',
        header: 'Duration',
        sortable: false,
        render: (c) => <span className="text-text-muted">{summarizeDuration(c)}</span>,
      },
      {
        key: 'redemptions',
        header: 'Redemptions',
        align: 'center',
        sortValue: (c) => c.times_redeemed,
        render: (c) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRedemptionsTarget(c);
            }}
            className="text-text hover:text-accent hover:underline"
          >
            {c.times_redeemed} / {c.max_redemptions ?? '∞'}
          </button>
        ),
      },
      {
        key: 'redeemable_until',
        header: 'Redeemable until',
        sortValue: (c) => (c.redeemable_until ? new Date(c.redeemable_until) : null),
        render: (c) =>
          c.redeemable_until ? (
            <Tooltip content={formatExpirationDate(c.redeemable_until).dateTime}>
              <span className="text-text-muted cursor-help">
                {formatExpirationDate(c.redeemable_until).date}
              </span>
            </Tooltip>
          ) : (
            <span className="text-text-faint">No limit</span>
          ),
      },
      {
        key: 'status',
        header: 'Status',
        align: 'center',
        sortable: false,
        render: (c) => {
          const s = getDiscountStatus(c);
          return <AdminStatusBadge variant={s.variant} label={s.label} />;
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        sortable: false,
        render: (c) => (
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={() => setRedemptionsTarget(c)}>
              View redemptions
            </Button>
            {c.is_active && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeactivateTarget(c)}
                disabled={actioningId === c.id}
              >
                {actioningId === c.id ? 'Deactivating...' : 'Deactivate'}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [actioningId]
  );

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <AdminPageHeader
          title="Discount Codes"
          subtitle="Codes that issue pricing rules onto redeeming organizations"
          actions={
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Code
            </Button>
          }
        />

        <Card title="Discount Codes" description="Codes are immutable once created — deactivate rather than edit">
          <div className="mb-4">
            <div className="relative">
              <input
                type="search"
                placeholder="Search codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-3 rounded-md border border-border bg-surface-alt text-sm text-text placeholder:text-text-faint transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-focus-ring"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Mobile card view */}
          <div className="sm:hidden">
            {showSkeleton ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-lg border border-border p-4 bg-surface">
                    <div className="h-4 bg-surface-alt rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-surface-alt rounded w-1/2 mt-2 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : filteredCodes.length === 0 ? (
              <div className="py-10 flex items-center justify-center border border-border rounded-lg">
                <div className="text-center">
                  <svg className="mx-auto h-10 w-10 text-text-faint mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <p className="text-sm font-medium text-text">No discount codes found</p>
                  <p className="text-xs text-text-muted mt-1">
                    {searchQuery ? 'Try adjusting your search.' : 'Create your first discount code to get started.'}
                  </p>
                  {!searchQuery && (
                    <Button variant="primary" size="sm" className="mt-3" onClick={() => setShowCreateModal(true)}>
                      Create Discount Code
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedCodes.map((code) => {
                  const status = getDiscountStatus(code);
                  return (
                    <div
                      key={code.id}
                      className="rounded-lg border border-border bg-surface p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-mono font-bold text-text text-lg">{code.code}</p>
                          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                            {summarizeRules(code.rules)}
                          </p>
                          <p className="text-xs text-text-muted">{summarizeDuration(code)}</p>
                        </div>
                        <AdminStatusBadge variant={status.variant} label={status.label} />
                      </div>
                      <div className="space-y-2 pt-3 border-t border-border text-sm">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Redemptions:</span>
                          <span className="text-text">
                            {code.times_redeemed} / {code.max_redemptions ?? '∞'}
                          </span>
                        </div>
                        {code.redeemable_until && (
                          <div className="flex justify-between">
                            <span className="text-text-muted">Redeemable until:</span>
                            <span className="text-text">
                              {formatDateWithRelative(code.redeemable_until).relative}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-border flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setRedemptionsTarget(code)}
                        >
                          View redemptions
                        </Button>
                        {code.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setDeactivateTarget(code)}
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredCodes.length > itemsPerPage && (
                  <div className="pt-2">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      totalItems={filteredCodes.length}
                      itemsPerPage={itemsPerPage}
                      position="bottom"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block">
            <AdminDataTable<DiscountCodeWithRules>
              data={filteredCodes}
              columns={columns}
              getRowId={(c) => c.id}
              pageSize={itemsPerPage}
              loading={showSkeleton}
              loadingRows={8}
              emptyState={
                <div className="py-12 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-text-faint mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <p className="text-text font-medium">No discount codes found</p>
                    <p className="text-text-muted text-sm mt-1">
                      {searchQuery ? 'Try adjusting your search.' : 'Create your first discount code to get started.'}
                    </p>
                    {!searchQuery && (
                      <Button variant="primary" size="sm" className="mt-3" onClick={() => setShowCreateModal(true)}>
                        Create Discount Code
                      </Button>
                    )}
                  </div>
                </div>
              }
            />
          </div>
        </Card>

        {!loading && filteredCodes.length > 0 && filteredCodes.length <= itemsPerPage && (
          <p className="text-sm text-text-muted mt-4">
            Showing {filteredCodes.length} of {codes.length} discount codes
          </p>
        )}

        <CreateDiscountCodeModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchCodes}
        />

        <RedemptionsModal code={redemptionsTarget} onClose={() => setRedemptionsTarget(null)} />

        <ConfirmationModal
          isOpen={deactivateTarget !== null}
          onClose={() => setDeactivateTarget(null)}
          onConfirm={handleDeactivate}
          title="Deactivate discount code"
          message="Deactivating stops new redemptions. Organizations that already redeemed this code keep their pricing until it expires."
          variant="warning"
          isLoading={actioningId !== null}
        />
      </AdminLayout>
    </AdminProtectedRoute>
  );
}

export default function AdminDiscountsPage() {
  return (
    <Suspense fallback={null}>
      <AdminDiscountsPageContent />
    </Suspense>
  );
}
