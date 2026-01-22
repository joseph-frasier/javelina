'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Tooltip, InfoIcon } from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { Pagination } from '@/components/admin/Pagination';
import { discountsApi, PromotionCode } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { formatDateWithRelative, formatExpirationDate } from '@/lib/utils/time';

// Create Discount Modal Component
interface CreateDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateDiscountModal({ isOpen, onClose, onSuccess }: CreateDiscountModalProps) {
  const { addToast } = useToastStore();
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percent_off' as 'percent_off' | 'amount_off',
    discount_value: '',
    max_redemptions: '',
    expires_at: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle opening/closing with animation
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    }
  }, [isOpen]);

  // GSAP Opening Animation
  useGSAP(() => {
    if (!mounted || !shouldRender) return;

    if (isOpen && modalRef.current && overlayRef.current) {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );

      gsap.fromTo(
        modalRef.current,
        { scale: 0.95, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }
      );
    }
  }, [isOpen, mounted, shouldRender]);

  // Handle closing animation
  useEffect(() => {
    if (!mounted || !shouldRender) return;
    if (isOpen) return;

    if (modalRef.current && overlayRef.current) {
      gsap.killTweensOf([modalRef.current, overlayRef.current]);

      const tl = gsap.timeline({
        onComplete: () => setShouldRender(false)
      });

      tl.to(overlayRef.current, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in'
      });

      tl.to(modalRef.current, {
        scale: 0.95,
        opacity: 0,
        y: 20,
        duration: 0.2,
        ease: 'power2.in'
      }, 0);
    }
  }, [isOpen, mounted, shouldRender]);

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
      const discountValue = formData.discount_type === 'amount_off' 
        ? Math.round(parseFloat(formData.discount_value) * 100) 
        : parseFloat(formData.discount_value);

      // Convert local datetime to UTC ISO string
      // datetime-local input returns "2025-12-02T13:44" (local time, no timezone)
      // We need to convert this to UTC for consistent storage
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

  if (!shouldRender || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4"
      >
        <div className="p-6 border-b border-gray-light dark:border-gray-700">
          <h2 className="text-xl font-bold text-orange-dark dark:text-orange">
            Create Discount Code
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Code Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Discount Code *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g., SAVE20"
              className="w-full px-3 py-2 border border-gray-light dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange dark:bg-gray-700 dark:text-white"
            />
            {errors.code && (
              <p className="mt-1 text-sm text-red-600">{errors.code}</p>
            )}
          </div>

          {/* Discount Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Discount Type *
            </label>
            <select
              value={formData.discount_type}
              onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percent_off' | 'amount_off' })}
              className="w-full px-3 py-2 border border-gray-light dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange dark:bg-gray-700 dark:text-white"
            >
              <option value="percent_off">Percentage Off</option>
              <option value="amount_off">Fixed Amount Off</option>
            </select>
          </div>

          {/* Discount Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {formData.discount_type === 'percent_off' ? 'Percentage (%)' : 'Amount ($)'} *
            </label>
            <div className="relative">
              {formData.discount_type === 'amount_off' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              )}
              <input
                type="number"
                step={formData.discount_type === 'percent_off' ? '1' : '0.01'}
                min="0"
                max={formData.discount_type === 'percent_off' ? '100' : undefined}
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                placeholder={formData.discount_type === 'percent_off' ? 'e.g., 20' : 'e.g., 10.00'}
                className={`w-full px-3 py-2 border border-gray-light dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange dark:bg-gray-700 dark:text-white ${
                  formData.discount_type === 'amount_off' ? 'pl-7' : ''
                }`}
              />
              {formData.discount_type === 'percent_off' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              )}
            </div>
            {errors.discount_value && (
              <p className="mt-1 text-sm text-red-600">{errors.discount_value}</p>
            )}
          </div>

          {/* Max Redemptions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Redemptions
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              type="number"
              min="1"
              value={formData.max_redemptions}
              onChange={(e) => setFormData({ ...formData, max_redemptions: e.target.value })}
              placeholder="Unlimited"
              className="w-full px-3 py-2 border border-gray-light dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange dark:bg-gray-700 dark:text-white"
            />
            {errors.max_redemptions && (
              <p className="mt-1 text-sm text-red-600">{errors.max_redemptions}</p>
            )}
          </div>

          {/* Expiration Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Expiration Date
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-light dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-400">
              Enter time in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
            </p>
          </div>

          {/* Note */}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This code will be created in Stripe and synced to the database for tracking.
          </p>
        </form>

        <div className="p-6 flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating...
              </div>
            ) : (
              'Create Code'
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default function AdminDiscountsPage() {
  const { addToast } = useToastStore();
  const [promotionCodes, setPromotionCodes] = useState<PromotionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  
  // Confirmation modal
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
      // Show empty state - backend may not be implemented yet
      setPromotionCodes([]);
      addToast('info', 'Discount codes feature requires backend implementation');
    } finally {
      setLoading(false);
    }
  }, [showActiveOnly, addToast]);

  useEffect(() => {
    fetchPromotionCodes();
  }, [fetchPromotionCodes]);

  // Delay showing skeleton to avoid flash for quick loads
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowSkeleton(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(false);
    }
  }, [loading]);

  // Filter codes
  const filteredCodes = promotionCodes.filter((code) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return code.code.toLowerCase().includes(query);
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCodes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCodes = filteredCodes.slice(startIndex, startIndex + itemsPerPage);

  // Stats
  const stats = {
    total: promotionCodes.length,
    active: promotionCodes.filter((c) => c.is_active).length,
    totalRedemptions: promotionCodes.reduce((sum, c) => sum + c.times_redeemed, 0),
    expiredSoon: promotionCodes.filter((c) => {
      if (!c.expires_at || !c.is_active) return false;
      const expiresAt = new Date(c.expires_at);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return expiresAt <= weekFromNow && expiresAt > new Date();
    }).length,
  };

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
    // amount_off is stored in cents
    return `$${(code.discount_value / 100).toFixed(2)} off`;
  };

  const getStatusBadge = (code: PromotionCode) => {
    if (!code.is_active) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          Inactive
        </span>
      );
    }
    
    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Expired
        </span>
      );
    }
    
    if (code.max_redemptions && code.times_redeemed >= code.max_redemptions) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          Limit Reached
        </span>
      );
    }
    
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        Active
      </span>
    );
  };

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-orange-dark dark:text-orange">Discount Codes</h1>
              <p className="text-sm sm:text-base text-gray-slate dark:text-gray-300 mt-1 sm:mt-2">
                Manage promotion codes for checkout discounts
              </p>
            </div>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Code
            </Button>
          </div>

          {/* Stat Cards - Temporarily disabled until backend sync is complete */}
          {false && !loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Codes"
                value={stats.total}
                color="blue"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                }
              />
              <StatCard
                label="Active Codes"
                value={stats.active}
                color="green"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                label="Total Redemptions"
                value={stats.totalRedemptions}
                color="orange"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
              />
              <StatCard
                label="Expiring Soon"
                value={stats.expiredSoon}
                color={stats.expiredSoon > 0 ? 'orange' : 'gray'}
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>
          )}

          {/* Codes Table */}
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-orange-dark dark:text-orange">Discount Codes</h2>
                <Tooltip content="Promotion codes synced with Stripe">
                  <InfoIcon />
                </Tooltip>
              </div>
              {filteredCodes.length > itemsPerPage && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredCodes.length}
                  itemsPerPage={itemsPerPage}
                  position="top"
                />
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <input
                  type="search"
                  placeholder="Search codes..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 pl-10 rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
{/* Active only filter - Temporarily disabled until backend filtering is complete
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={showActiveOnly}
                  onChange={(e) => {
                    setShowActiveOnly(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                Active only
              </label>
              */}
            </div>

            {showSkeleton ? (
              <>
                {/* Mobile Skeleton */}
                <div className="sm:hidden space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
                          </div>
                        </div>
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                      <div className="space-y-2 pt-3 border-t border-gray-light dark:border-gray-700">
                        <div className="flex justify-between">
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                        </div>
                        <div className="flex justify-between">
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Desktop Skeleton */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-light dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Code</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Discount</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Uses</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Expires</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(8)].map((_, i) => (
                        <tr key={i} className="border-b border-gray-light dark:border-gray-700">
                          <td className="py-3 px-4">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                          </td>
                          <td className="py-3 px-4">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 mx-auto animate-pulse" />
                          </td>
                          <td className="py-3 px-4">
                            <div className="mx-auto h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16 animate-pulse" />
                          </td>
                          <td className="py-3 px-4">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="ml-auto h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : filteredCodes.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <p className="text-gray-slate dark:text-gray-300 text-lg font-medium">No discount codes found</p>
                <p className="text-gray-400 text-sm mt-2">
                  {searchQuery ? 'Try adjusting your search.' : 'Create your first discount code to get started.'}
                </p>
                {!searchQuery && (
                  <Button variant="primary" className="mt-4" onClick={() => setShowCreateModal(true)}>
                    Create Discount Code
                  </Button>
                )}
              </div>
            ) : (
              <div className="animate-fadeIn">
                {/* Mobile Card View */}
                <div className="sm:hidden space-y-3">
                  {paginatedCodes.map((code) => (
                    <Card key={code.id} className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-mono font-bold text-orange-dark dark:text-orange text-lg">
                            {code.code}
                          </p>
                          <p className="text-sm text-green-600 font-medium">
                            {formatDiscountValue(code)}
                          </p>
                        </div>
                        {getStatusBadge(code)}
                      </div>
                      <div className="space-y-2 pt-3 border-t border-gray-light dark:border-gray-700 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Redemptions:</span>
                          <span className="text-gray-900 dark:text-white">
                            {code.times_redeemed}
                            {code.max_redemptions && ` / ${code.max_redemptions}`}
                          </span>
                        </div>
                        {code.expires_at && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Expires:</span>
                            <span className="text-gray-900 dark:text-white">
                              {formatDateWithRelative(code.expires_at).relative}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Created by:</span>
                          <span className="text-gray-900 dark:text-white">
                            {code.creator_name || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      {code.is_active && (
                        <div className="mt-3 pt-3 border-t border-gray-light dark:border-gray-700">
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
                    </Card>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-light dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Code</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Discount</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Redemptions</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Expires</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Created</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Creator</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCodes.map((code) => (
                        <tr key={code.id} className="border-b border-gray-light dark:border-gray-700">
                          <td className="py-3 px-4">
                            <p className="font-mono font-bold text-orange-dark dark:text-orange">
                              {code.code}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-green-600 font-medium">
                              {formatDiscountValue(code)}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-gray-900 dark:text-white">
                              {code.times_redeemed}
                              {code.max_redemptions && (
                                <span className="text-gray-400"> / {code.max_redemptions}</span>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {getStatusBadge(code)}
                          </td>
                          <td className="py-3 px-4">
                            {code.expires_at ? (
                              <Tooltip content={formatExpirationDate(code.expires_at).dateTime}>
                                <span className="text-gray-600 dark:text-gray-300 cursor-help">
                                  {formatExpirationDate(code.expires_at).date}
                                </span>
                              </Tooltip>
                            ) : (
                              <span className="text-gray-400">Never</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Tooltip content={formatDateWithRelative(code.created_at).absolute}>
                              <span className="text-gray-600 dark:text-gray-300 cursor-help">
                                {formatDateWithRelative(code.created_at).relative}
                              </span>
                            </Tooltip>
                          </td>
                          <td className="py-3 px-4">
                            {code.creator_name ? (
                              <Tooltip content={code.creator_email || 'No email available'}>
                                <span className="text-gray-600 dark:text-gray-300 cursor-help">
                                  {code.creator_name}
                                </span>
                              </Tooltip>
                            ) : (
                              <span className="text-gray-400">Unknown</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {code.is_active ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => confirmDeactivate(code)}
                                disabled={actioningId === code.id}
                              >
                                {actioningId === code.id ? 'Deactivating...' : 'Deactivate'}
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-sm">Inactive</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Pagination */}
                {filteredCodes.length > itemsPerPage && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredCodes.length}
                    itemsPerPage={itemsPerPage}
                    position="bottom"
                  />
                )}
              </div>
            )}
          </Card>

          {/* Summary */}
          {!loading && filteredCodes.length > 0 && filteredCodes.length <= itemsPerPage && (
            <p className="text-sm text-gray-slate dark:text-gray-400">
              Showing {filteredCodes.length} of {promotionCodes.length} discount codes
            </p>
          )}
        </div>

        {/* Create Modal */}
        <CreateDiscountModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchPromotionCodes}
        />

        {/* Confirmation Modal */}
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

