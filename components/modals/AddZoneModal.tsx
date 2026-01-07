'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { createZone } from '@/lib/actions/zones';
import { useToastStore } from '@/lib/toast-store';
import { usePlanLimits } from '@/lib/hooks/usePlanLimits';
import { useUsageCounts } from '@/lib/hooks/useUsageCounts';
import { UpgradeLimitBanner } from '@/components/ui/UpgradeLimitBanner';

interface AddZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  /** Plan code from the organization's subscription (e.g., 'starter_lifetime', 'pro') */
  planCode?: string;
  onSuccess?: (zoneId: string) => void;
}

export function AddZoneModal({ 
  isOpen, 
  onClose, 
  organizationId,
  organizationName,
  planCode,
  onSuccess 
}: AddZoneModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [adminEmail, setAdminEmail] = useState('admin@example.com');
  const [negativeCachingTTL, setNegativeCachingTTL] = useState(3600);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; admin_email?: string; negative_caching_ttl?: string; general?: string }>({});

  const { addToast } = useToastStore();
  
  // Plan limits and usage tracking
  const { limits, tier, wouldExceedLimit } = usePlanLimits(planCode);
  const { usage, isLoading: isLoadingUsage, refetch: refetchUsage } = useUsageCounts(organizationId);
  
  // Refetch usage counts when modal opens to get fresh data
  useEffect(() => {
    if (isOpen) {
      refetchUsage();
    }
  }, [isOpen, refetchUsage]);
  
  // Check if at zone limit
  const currentZoneCount = usage?.zones ?? 0;
  const isAtZoneLimit = wouldExceedLimit('zones', currentZoneCount);

  // Debug logging
  console.log('AddZoneModal Debug:', {
    planCode,
    tier,
    limits,
    usage,
    currentZoneCount,
    isAtZoneLimit,
    isLoadingUsage,
    organizationId
  });

  const validateForm = (): boolean => {
    const newErrors: { name?: string; admin_email?: string; negative_caching_ttl?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Zone name is required';
    } else if (name.length > 253) {
      newErrors.name = 'Zone name must be 253 characters or less';
    } else if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(name)) {
      newErrors.name = 'Zone name must be a valid domain name (e.g., example.com or subdomain.example.com)';
    }

    // Validate admin email
    if (!adminEmail.trim()) {
      newErrors.admin_email = 'Admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      newErrors.admin_email = 'Invalid email format';
    }

    // Validate negative caching TTL
    if (negativeCachingTTL < 0 || negativeCachingTTL > 86400) {
      newErrors.negative_caching_ttl = 'Negative caching TTL must be between 0 and 86400 seconds';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await createZone({
        name: name.trim().toLowerCase(), // Domains are case-insensitive
        description: description.trim() || undefined,
        organization_id: organizationId,
        admin_email: adminEmail.trim(),
        negative_caching_ttl: negativeCachingTTL
      });

      // Check for error response
      if (result.error) {
        setErrors({ general: result.error });
        addToast('error', result.error);
        setIsSubmitting(false);
        return;
      }

      const zone = result.data;

      // Invalidate React Query cache for zones
      await queryClient.invalidateQueries({ queryKey: ['zones', organizationId] });
      
      // Refresh the page data
      router.refresh();

      addToast('success', `Zone "${zone.name}" created successfully!`);
      
      // Reset form
      setName('');
      setDescription('');
      setAdminEmail('admin@example.com');
      setNegativeCachingTTL(3600);
      
      // Call success callback
      if (onSuccess) {
        onSuccess(zone.id);
      }
      
      // Close modal
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create zone';
      setErrors({ general: errorMessage });
      addToast('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      // Call onClose first to start the animation
      onClose();
      // Clear form state after animation completes (200ms)
      setTimeout(() => {
        setName('');
        setDescription('');
        setAdminEmail('admin@example.com');
        setNegativeCachingTTL(3600);
        setErrors({});
      }, 250);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Zone" size="medium">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Plan limit warning/block */}
        {!isLoadingUsage && (
          <UpgradeLimitBanner
            resourceType="zones"
            currentCount={currentZoneCount}
            maxCount={limits.zones}
            planTier={tier.charAt(0).toUpperCase() + tier.slice(1)}
            isAtLimit={isAtZoneLimit}
            organizationId={organizationId}
          />
        )}
        
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{errors.general}</p>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-slate mb-4">
            Adding zone to: <span className="font-semibold text-orange-dark dark:text-white">{organizationName}</span>
          </p>
        </div>

        <div>
          <label htmlFor="zone-name" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Zone Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="zone-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., example.com or subdomain.example.com"
            disabled={isSubmitting}
            className={errors.name ? 'border-red-500' : ''}
            maxLength={253}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
          <p className="mt-1 text-xs text-gray-slate">
            Enter a valid domain name. {name.length}/253 characters
          </p>
        </div>

        <div>
          <label htmlFor="zone-description" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Description
          </label>
          <textarea
            id="zone-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description or notes"
            disabled={isSubmitting}
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-light rounded-md focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent disabled:bg-gray-light disabled:cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-slate">
            {description.length}/500 characters
          </p>
        </div>

        {/* SOA Configuration Section */}
        <div className="pt-4 border-t border-gray-light -mx-6 px-6">
          <h3 className="text-sm font-semibold text-orange-dark dark:text-white mb-3">
            SOA Configuration
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                Admin Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="admin-email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled={isSubmitting}
                className={errors.admin_email ? 'border-red-500' : ''}
              />
              {errors.admin_email && (
                <p className="mt-1 text-sm text-red-600">{errors.admin_email}</p>
              )}
              <p className="mt-1 text-xs text-gray-slate">
                Administrative contact email for this zone
              </p>
            </div>

            <div>
              <label htmlFor="negative-ttl" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                Negative Caching TTL (seconds) <span className="text-red-500">*</span>
              </label>
              <Input
                id="negative-ttl"
                type="text"
                value={negativeCachingTTL}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setNegativeCachingTTL(parseInt(value, 10) || 0);
                }}
                placeholder="3600"
                disabled={isSubmitting}
                className={errors.negative_caching_ttl ? 'border-red-500' : ''}
              />
              {errors.negative_caching_ttl && (
                <p className="mt-1 text-sm text-red-600">{errors.negative_caching_ttl}</p>
              )}
              <p className="mt-1 text-xs text-gray-slate">
                How long to cache negative DNS responses (0-86400 seconds)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !name.trim() || isAtZoneLimit}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              'Save Zone'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
