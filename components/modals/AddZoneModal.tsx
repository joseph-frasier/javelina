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
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import { detectZoneOverlap } from '@/lib/utils/dns-validation';
import { createClient } from '@/lib/supabase/client';
import { subscriptionsApi } from '@/lib/api-client';

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
  const [allZoneNames, setAllZoneNames] = useState<string[]>([]);

  const { addToast } = useToastStore();
  const { hideUpgradeLimitCta } = useFeatureFlags();

  // Fetch plan code from API if not provided as a prop
  const [fetchedPlanCode, setFetchedPlanCode] = useState<string | null>(null);
  useEffect(() => {
    setFetchedPlanCode(null);
    if (planCode || !organizationId || !isOpen) return;
    let cancelled = false;
    subscriptionsApi.getOrgPlan(organizationId).then((planData) => {
      if (!cancelled && planData?.plan_code) {
        setFetchedPlanCode(planData.plan_code);
      }
    }).catch(() => {
      // Fall back to defaults if fetch fails
    });
    return () => { cancelled = true; };
  }, [planCode, organizationId, isOpen]);

  const resolvedPlanCode = planCode || fetchedPlanCode || undefined;

  // Plan limits and usage tracking
  const { limits, tier, wouldExceedLimit } = usePlanLimits(resolvedPlanCode);
  const { usage, refetch: refetchUsage } = useUsageCounts(organizationId);
  
  // Fetch all zone names globally for overlap detection
  useEffect(() => {
    const fetchAllZones = async () => {
      if (!isOpen) return;
      
      try {
        const supabase = createClient();
        // Fetch all zone names globally (across all orgs, including deleted)
        const { data, error } = await supabase
          .from('zones')
          .select('name');
        
        if (error) {
          console.error('Error fetching zones for validation:', error);
          return;
        }
        
        setAllZoneNames((data || []).map(z => z.name));
      } catch (error) {
        console.error('Error fetching zones:', error);
      }
    };
    
    fetchAllZones();
  }, [isOpen]);
  
  // Refetch usage counts when modal opens to get fresh data
  useEffect(() => {
    if (isOpen) {
      refetchUsage();
    }
  }, [isOpen, refetchUsage]);
  
  // Check if at zone limit
  const maxZones = limits.zones;
  const currentZoneCount = usage?.zones ?? 0;
  const isAtZoneLimit = wouldExceedLimit('zones', currentZoneCount);
  const hasFiniteZoneLimit = maxZones !== -1;
  const percentUsed = hasFiniteZoneLimit
    ? maxZones > 0
      ? (currentZoneCount / maxZones) * 100
      : 100
    : 0;
  const roundedPercentUsed = Math.round(Math.max(0, percentUsed));
  const progressWidthPercent = Math.min(100, Math.max(0, percentUsed));
  const isNearLimit = !isAtZoneLimit && roundedPercentUsed >= 80;
  const showLimitCallout = hasFiniteZoneLimit && usage !== null && roundedPercentUsed >= 80;
  const remainingZones = Math.max(0, maxZones - currentZoneCount);
  const shouldShowUpgradeCta = !hideUpgradeLimitCta;
  const planTierLabel = (() => {
    if (planCode) {
      const normalizedPlanCode = planCode.toLowerCase();
      const baseLabel = normalizedPlanCode.includes('enterprise')
        ? 'Enterprise'
        : normalizedPlanCode.includes('business') || normalizedPlanCode.includes('premium')
          ? 'Business'
          : normalizedPlanCode.includes('pro')
            ? 'Pro'
            : 'Starter';
      return normalizedPlanCode.includes('_lifetime') ? `${baseLabel} Lifetime` : baseLabel;
    }

    return tier.charAt(0).toUpperCase() + tier.slice(1);
  })();

  const handleUpgradeClick = () => {
    if (organizationId) {
      router.push(`/settings/billing/${organizationId}?openModal=true`);
      return;
    }

    router.push('/pricing');
  };

  const validateForm = (): boolean => {
    const newErrors: { name?: string; admin_email?: string; negative_caching_ttl?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Zone name is required';
    } else if (name.length > 253) {
      newErrors.name = 'Zone name must be 253 characters or less';
    } else {
      // Check minimum 2 labels requirement (must have at least one dot)
      const labels = name.split('.').filter(l => l.length > 0);
      if (labels.length < 2) {
        newErrors.name = 'Zone name must have at least 2 labels (e.g., example.com, not just "example")';
      } else if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(name)) {
        newErrors.name = 'Zone name must be a valid domain name (e.g., example.com or subdomain.example.com)';
      } else {
        // Check for zone overlap (hierarchical conflicts)
        const overlapResult = detectZoneOverlap(name, allZoneNames);
        if (overlapResult.hasOverlap) {
          newErrors.name = `Zone conflicts with existing zone: ${overlapResult.conflictingZone}`;
        }
      }
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
      <form onSubmit={handleSubmit} className="space-y-5">
        {showLimitCallout ? (
          <div
            data-testid="zone-limit-callout"
            className={`rounded-lg border px-4 py-3 ${
              isAtZoneLimit
                ? 'border-red-500/35 bg-red-500/10'
                : 'border-amber-500/35 bg-amber-500/10'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold ${
                    isAtZoneLimit ? 'text-red-200' : 'text-amber-200'
                  }`}
                >
                  {isAtZoneLimit ? 'Zone Limit Reached' : 'Approaching Zone Limit'}
                </p>
                <p
                  className={`mt-1 text-xs leading-relaxed ${
                    isAtZoneLimit ? 'text-red-100/90' : 'text-amber-100/90'
                  }`}
                >
                  {isAtZoneLimit
                    ? `You've reached the zone limit for ${planTierLabel}. Upgrade to add more zones.`
                    : `${remainingZones} ${remainingZones === 1 ? 'zone' : 'zones'} remaining on ${planTierLabel}.`}
                </p>
              </div>

              {shouldShowUpgradeCta ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleUpgradeClick}
                  className="h-9 shrink-0"
                >
                  Upgrade Plan
                </Button>
              ) : null}
            </div>

            <div className="mt-3">
              <div
                className={`mb-1 flex items-center justify-between text-xs ${
                  isAtZoneLimit ? 'text-red-100/95' : 'text-amber-100/95'
                }`}
              >
                <span>
                  {currentZoneCount} / {maxZones} zones
                </span>
                <span>{roundedPercentUsed}% used</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-black/25">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    isAtZoneLimit ? 'bg-red-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${progressWidthPercent}%` }}
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        ) : null}

        {isAtZoneLimit ? (
          <p className="text-xs font-medium text-red-300">
            Creating zones is disabled until you upgrade your plan.
          </p>
        ) : null}
        
        {errors.general && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-200">{errors.general}</p>
          </div>
        )}

        <div className="rounded-lg border border-border/60 dark:border-gray-slate/60 bg-transparent p-3">
          <p className="text-sm text-text-muted">
            Adding zone to: <span className="font-semibold text-text">{organizationName}</span>
          </p>
        </div>

        <div>
          <label htmlFor="zone-name" className="block text-sm font-medium text-text mb-2">
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
          <p className="mt-1 text-xs text-text-muted">
            Enter a valid domain name. {name.length}/253 characters
          </p>
        </div>

        <div>
          <label htmlFor="zone-description" className="block text-sm font-medium text-text mb-2">
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
            className="w-full px-3 py-2 border border-border rounded-md bg-surface-alt text-text placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-text-muted">
            {description.length}/500 characters
          </p>
        </div>

        {/* SOA Configuration Section */}
        <div className="rounded-lg border border-border/60 dark:border-gray-slate/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-text">
            SOA Configuration
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-text mb-2">
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
              <p className="mt-1 text-xs text-text-muted">
                Administrative contact email for this zone
              </p>
            </div>

            <div>
              <label htmlFor="negative-ttl" className="block text-sm font-medium text-text mb-2">
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
              <p className="mt-1 text-xs text-text-muted">
                How long to cache negative DNS responses (0-86400 seconds)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-11 px-5"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !name.trim() || isAtZoneLimit}
            className="h-11 min-w-[144px]"
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
