'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Modal } from '@/components/ui/Modal';
import { Tooltip, InfoIcon } from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { Pagination } from '@/components/admin/Pagination';
import { discountsApi, PromotionCode } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { formatDateWithRelative, formatExpirationDate } from '@/lib/utils/time';

// Create Discount Modal — uses shared Modal/Input/Dropdown primitives.
// Validation and submit logic preserved byte-for-byte from the previous
// inline GSAP modal implementation.
interface CreateDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateDiscountModal({ isOpen, onClose, onSuccess }: CreateDiscountModalProps) {
  const { addToast } = useToastStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percent_off' as 'percent_off' | 'amount_off',
    discount_value: '',
    max_redemptions: '',
    expires_at: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percent_off',
      discount_value: '',
      max_redemptions: '',
      expires_at: '',
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Discount code is required';
    } else if (!/^[A-Z0-9_-]+$/i.test(formData.code)) {
      newErrors.code = 'Code can only contain letters, numbers, dashes, and underscores';
    }

    if (!formData.discount_value) {
      newErrors.discount_value = 'Discount value is required';
    } else {
      const value = parseFloat(formData.discount_value);
      if (isNaN(value) || value <= 0) {
        newErrors.discount_value = 'Value must be a positive number';
      } else if (formData.discount_type === 'percent_off' && value > 100) {
        newErrors.discount_value = 'Percentage cannot exceed 100%';
      }
    }

    if (formData.max_redemptions) {
      const value = parseInt(formData.max_redemptions);
      if (isNaN(value) || value < 1) {
        newErrors.max_redemptions = 'Must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Convert discount value to cents for amount_off
      const discountValue =
        formData.discount_type === 'amount_off'
          ? Math.round(parseFloat(formData.discount_value) * 100)
          : parseFloat(formData.discount_value);

      // Convert local datetime to UTC ISO string
      const expiresAtUTC = formData.expires_at
        ? new Date(formData.expires_at).toISOString()
        : undefined;

      await discountsApi.create({
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: discountValue,
        max_redemptions: formData.max_redemptions ? parseInt(formData.max_redemptions) : undefined,
        expires_at: expiresAtUTC,
        first_time_transaction_only: true,
      });

      addToast('success', 'Discount code created successfully');
      handleClose();
      onSuccess();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to create discount code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPercentOff = formData.discount_type === 'percent_off';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Discount Code"
      size="small"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Code'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Discount Code *"
          type="text"
          value={formData.code}
          onChange={(e) =>
            setFormData({ ...formData, code: e.target.value.toUpperCase() })
          }
          placeholder="e.g., SAVE20"
          error={errors.code}
          disabled={isSubmitting}
        />

        <Dropdown
          label="Discount Type *"
          value={formData.discount_type}
          options={[
            { value: 'percent_off', label: 'Percentage Off' },
            { value: 'amount_off', label: 'Fixed Amount Off' },
          ]}
          onChange={(value) =>
            setFormData({
              ...formData,
              discount_type: value as 'percent_off' | 'amount_off',
            })
          }
          disabled={isSubmitting}
        />

        <Input
          label={isPercentOff ? 'Percentage (%) *' : 'Amount ($) *'}
          type="number"
          step={isPercentOff ? '1' : '0.01'}
          min={0}
          max={isPercentOff ? 100 : undefined}
          value={formData.discount_value}
          onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
          placeholder={isPercentOff ? 'e.g., 20' : 'e.g., 10.00'}
          error={errors.discount_value}
          disabled={isSubmitting}
        />

        <Input
          label="Max Redemptions"
          type="number"
          min={1}
          value={formData.max_redemptions}
          onChange={(e) =>
            setFormData({ ...formData, max_redemptions: e.target.value })
          }
          placeholder="Unlimited"
          helperText="Optional. Leave blank for unlimited."
          error={errors.max_redemptions}
          disabled={isSubmitting}
        />

        <Input
          label="Expiration Date"
          type="datetime-local"
          value={formData.expires_at}
          onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
          helperText={`Optional. Local timezone: ${
            Intl.DateTimeFormat().resolvedOptions().timeZone
          }`}
          disabled={isSubmitting}
        />

        <p className="text-xs text-text-muted">
          This code will be created in Stripe and synced to the database for tracking.
        </p>
      </form>
    </Modal>
  );
}

type DiscountStatusVariant = 'success' | 'warning' | 'danger' | 'neutral';

function getDiscountStatus(code: PromotionCode): {
  label: string;
  variant: DiscountStatusVariant;
} {
  if (!code.is_active) return { label: 'Inactive', variant: 'neutral' };
  if (code.expires_at && new Date(code.expires_at) < new Date()) {
    return { label: 'Expired', variant: 'danger' };
  }
  if (code.max_redemptions && code.times_redeemed >= code.max_redemptions) {
    return { label: 'Limit Reached', variant: 'warning' };
  }
  return { label: 'Active', variant: 'success' };
}

function AdminDiscountsPageContent() {
  const searchParams = useSearchParams();
  const { addToast } = useToastStore();
  const [promotionCodes, setPromotionCodes] = useState<PromotionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Mobile-only pagination (desktop pagination lives inside AdminDataTable)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger',
  });
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchPromotionCodes = useCallback(async () => {
    try {
      const data = await discountsApi.list({ active_only: showActiveOnly });
      setPromotionCodes(data.promotion_codes || []);
    } catch (error) {
      console.error('Failed to fetch promotion codes:', error);
      setPromotionCodes([]);
      addToast('info', 'Discount codes feature requires backend implementation');
    } finally {
      setLoading(false);
    }
  }, [showActiveOnly, addToast]);

  useEffect(() => {
    fetchPromotionCodes();
  }, [fetchPromotionCodes]);

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

  const filteredCodes = promotionCodes.filter((code) => {
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

  const confirmDeactivate = (code: PromotionCode) => {
    setConfirmModal({
      isOpen: true,
      title: 'Deactivate Discount Code',
      message: `Are you sure you want to deactivate "${code.code}"? Customers will no longer be able to use this code.`,
      variant: 'warning',
      onConfirm: () => handleDeactivate(code.id),
    });
  };

  const handleDeactivate = async (id: string) => {
    setActioningId(id);
    setConfirmModal({ ...confirmModal, isOpen: false });
    try {
      await discountsApi.deactivate(id);
      addToast('success', 'Discount code deactivated');
      setPromotionCodes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: false } : c))
      );
    } catch (error: any) {
      addToast('error', error.message || 'Failed to deactivate code');
    } finally {
      setActioningId(null);
    }
  };

  const formatDiscountValue = (code: PromotionCode) => {
    if (code.discount_type === 'percent_off') {
      return `${code.discount_value}% off`;
    }
    return `$${(code.discount_value / 100).toFixed(2)} off`;
  };

  const columns: AdminDataTableColumn<PromotionCode>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'Code',
        sortValue: (c) => c.code.toLowerCase(),
        render: (c) => <p className="font-mono font-bold text-text">{c.code}</p>,
      },
      {
        key: 'discount',
        header: 'Discount',
        sortable: false,
        render: (c) => (
          <p className="text-green-600 dark:text-green-400 font-medium">
            {formatDiscountValue(c)}
          </p>
        ),
      },
      {
        key: 'redemptions',
        header: 'Redemptions',
        align: 'center',
        sortValue: (c) => c.times_redeemed,
        render: (c) => (
          <span className="text-text">
            {c.times_redeemed}
            {c.max_redemptions && (
              <span className="text-text-faint"> / {c.max_redemptions}</span>
            )}
          </span>
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
        key: 'expires',
        header: 'Expires',
        sortValue: (c) => (c.expires_at ? new Date(c.expires_at) : null),
        render: (c) =>
          c.expires_at ? (
            <Tooltip content={formatExpirationDate(c.expires_at).dateTime}>
              <span className="text-text-muted cursor-help">
                {formatExpirationDate(c.expires_at).date}
              </span>
            </Tooltip>
          ) : (
            <span className="text-text-faint">Never</span>
          ),
      },
      {
        key: 'created_at',
        header: 'Created',
        sortValue: (c) => (c.created_at ? new Date(c.created_at) : null),
        render: (c) => (
          <Tooltip content={formatDateWithRelative(c.created_at).absolute}>
            <span className="text-text-muted cursor-help">
              {formatDateWithRelative(c.created_at).relative}
            </span>
          </Tooltip>
        ),
      },
      {
        key: 'creator',
        header: 'Creator',
        sortValue: (c) => (c.creator_name ?? '').toLowerCase(),
        render: (c) =>
          c.creator_name ? (
            <Tooltip content={c.creator_email || 'No email available'}>
              <span className="text-text-muted cursor-help">{c.creator_name}</span>
            </Tooltip>
          ) : (
            <span className="text-text-faint">Unknown</span>
          ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        sortable: false,
        render: (c) => (
          <div onClick={(e) => e.stopPropagation()}>
            {c.is_active ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => confirmDeactivate(c)}
                disabled={actioningId === c.id}
              >
                {actioningId === c.id ? 'Deactivating...' : 'Deactivate'}
              </Button>
            ) : (
              <span className="text-text-faint text-sm">Inactive</span>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actioningId]
  );

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <AdminPageHeader
          title="Discount Codes"
          subtitle="Manage promotion codes for checkout discounts"
          actions={
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Code
            </Button>
          }
        />

        {/* Stat Cards block intentionally not yet rendered — original page kept this disabled
            with `false &&` while backend sync is finalized. Preserving that behavior. */}

        <Card title="Discount Codes" description="Promotion codes synced with Stripe">
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
                            {formatDiscountValue(code)}
                          </p>
                        </div>
                        <AdminStatusBadge variant={status.variant} label={status.label} />
                      </div>
                      <div className="space-y-2 pt-3 border-t border-border text-sm">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Redemptions:</span>
                          <span className="text-text">
                            {code.times_redeemed}
                            {code.max_redemptions && ` / ${code.max_redemptions}`}
                          </span>
                        </div>
                        {code.expires_at && (
                          <div className="flex justify-between">
                            <span className="text-text-muted">Expires:</span>
                            <span className="text-text">
                              {formatDateWithRelative(code.expires_at).relative}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-text-muted">Created by:</span>
                          <span className="text-text">{code.creator_name || 'Unknown'}</span>
                        </div>
                      </div>
                      {code.is_active && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => confirmDeactivate(code)}
                          >
                            Deactivate
                          </Button>
                        </div>
                      )}
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
            <AdminDataTable<PromotionCode>
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
            Showing {filteredCodes.length} of {promotionCodes.length} discount codes
          </p>
        )}

        <CreateDiscountModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchPromotionCodes}
        />

        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
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
