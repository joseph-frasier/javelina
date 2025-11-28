'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UsageMeter } from './UsageMeter';
import { ChangePlanModal } from '@/components/modals/ChangePlanModal';
import type { CurrentSubscriptionResponse, OrgUsageWithLimits } from '@/types/billing';

interface SubscriptionManagerProps {
  orgId: string;
  onChangePlan?: () => void;
  onManageBilling?: () => void;
  onCancelSubscription?: () => void;
  refreshTrigger?: number;
}

export function SubscriptionManager({
  orgId,
  onChangePlan,
  onManageBilling,
  onCancelSubscription,
  refreshTrigger,
}: SubscriptionManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<CurrentSubscriptionResponse | null>(null);
  const [usage, setUsage] = useState<OrgUsageWithLimits | null>(null);
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);

  const fetchSubscriptionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch subscription via API client to route through Express backend
      const { subscriptionsApi } = await import('@/lib/api-client');
      const data = await subscriptionsApi.getCurrent(orgId);

      console.log('SubscriptionManager received data:', data);
      console.log('Plan object:', data.plan);
      console.log('Subscription object:', data.subscription);

      setSubscription(data);

      // Build usage data - all limits are now unlimited (managed by Launch Darkly)
      const usageData: OrgUsageWithLimits = {
        org_id: orgId,
        environments_count: 0, // TODO: Fetch actual counts
        zones_count: 0,
        members_count: 0,
        environments_limit: -1, // Unlimited
        zones_limit: -1, // Unlimited
        members_limit: -1, // Unlimited
        dns_records_limit: -1, // Unlimited
      };

      setUsage(usageData);
    } catch (err: any) {
      console.error('Error fetching subscription:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  // Refresh data when refreshTrigger changes (e.g., after plan upgrade from modal)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      fetchSubscriptionData();
    }
  }, [refreshTrigger, fetchSubscriptionData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    trialing: 'bg-blue-100 text-blue-800',
    past_due: 'bg-yellow-100 text-yellow-800',
    canceled: 'bg-red-100 text-red-800',
    incomplete: 'bg-gray-100 text-gray-800',
  };

  const statusColor = subscription?.subscription?.status
    ? statusColors[subscription.subscription.status] || 'bg-gray-100 text-gray-800'
    : 'bg-gray-100 text-gray-800';

  // Check if this is a subscription plan (not lifetime)
  const isSubscriptionPlan = subscription?.plan?.billing_interval === 'month';
  const currentPlanCode = subscription?.plan?.code || '';

  const handleChangePlan = () => {
    setShowChangePlanModal(true);
  };

  const handleChangePlanSuccess = () => {
    // Refresh subscription data
    fetchSubscriptionData();
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className="bg-white rounded-xl border border-gray-light shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-orange-dark">
              {subscription?.plan?.name || 'Current Plan'}
            </h3>
            <p className="text-sm text-gray-slate mt-1">
              {subscription?.plan?.metadata?.description || 'Loading plan details...'}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {subscription?.subscription?.status?.toUpperCase() || 'ACTIVE'}
          </span>
        </div>

        {/* Price */}
        {subscription?.plan?.metadata?.price && (
          <div className="mb-4 pb-4 border-b border-gray-light">
            <div className="flex flex-col">
              <span className="text-3xl font-black text-orange-dark">
                ${Number(subscription.plan.metadata.price).toFixed(2)}
              </span>
              <span className="text-xs text-gray-slate font-light uppercase tracking-wide mt-1">
                {subscription.plan.billing_interval ? `/${subscription.plan.billing_interval}` : 'ONE-TIME'}
              </span>
            </div>
          </div>
        )}

        {/* Billing Dates */}
        {subscription?.subscription?.current_period_end && (
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-slate">Next billing date</span>
              <span className="font-medium text-orange-dark">
                {new Date(subscription.subscription.current_period_end).toLocaleDateString()}
              </span>
            </div>
            {subscription.subscription.cancel_at_period_end && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 w-fit">
                <p className="text-xs text-yellow-800">
                  Your subscription will be canceled on {new Date(subscription.subscription.current_period_end).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          {/* Show buttons for monthly subscription plans only */}
          {isSubscriptionPlan && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleChangePlan}
                className="px-4 py-2 bg-orange text-white rounded-md font-medium hover:bg-orange-dark transition-colors"
              >
                Change Plan
              </button>
              {onManageBilling && (
                <button
                  onClick={onManageBilling}
                  className="px-4 py-2 bg-white text-orange border border-orange rounded-md font-medium hover:bg-orange-light transition-colors"
                >
                  Manage Billing
                </button>
              )}
              {onCancelSubscription && subscription?.subscription?.status === 'active' && (
                <button
                  onClick={onCancelSubscription}
                  className="px-4 py-2 text-red-600 hover:text-red-700 font-medium"
                >
                  Cancel Subscription
                </button>
              )}
              <button
                onClick={() => router.push(`/organization/${orgId}`)}
                className="ml-auto px-4 py-2 bg-orange text-white rounded-md font-medium hover:bg-orange-dark transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span>Back to Organization</span>
              </button>
            </div>
          )}
          
          {/* Lifetime plan actions - only for lifetime plans */}
          {!isSubscriptionPlan && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-900">
                  <strong>Lifetime plan:</strong> You have a lifetime subscription with a one-time payment. You can upgrade to a higher tier at any time.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleChangePlan}
                  className="px-4 py-2 bg-orange text-white rounded-md font-medium hover:bg-orange-dark transition-colors"
                >
                  Upgrade Plan
                </button>
                <button
                  onClick={() => router.push(`/organization/${orgId}`)}
                  className="ml-auto px-4 py-2 bg-white text-orange border border-orange rounded-md font-medium hover:bg-orange-light transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span>Back to Organization</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* TODO: Uncomment when integrating Launch Darkly for feature-based resource limits */}
      {/* Usage Meters - Currently showing unlimited for all resources */}
      {/* {usage && (
        <div className="bg-white rounded-xl border border-gray-light shadow-sm p-6">
          <h3 className="text-lg font-bold text-orange-dark mb-4">Resource Usage</h3>
          <div className="space-y-4">
            <UsageMeter
              current={usage.environments_count}
              limit={usage.environments_limit}
              label="Environments"
              resourceType="environment"
              onUpgrade={onChangePlan}
            />
            <UsageMeter
              current={usage.zones_count}
              limit={usage.zones_limit}
              label="DNS Zones"
              resourceType="zone"
              onUpgrade={onChangePlan}
            />
            <UsageMeter
              current={usage.members_count}
              limit={usage.members_limit}
              label="Team Members"
              resourceType="member"
              onUpgrade={onChangePlan}
            />
          </div>
        </div>
      )} */}

      {/* Change Plan Modal - available for both subscription and lifetime plans */}
      <ChangePlanModal
        isOpen={showChangePlanModal}
        onClose={() => setShowChangePlanModal(false)}
        currentPlanCode={currentPlanCode}
        orgId={orgId}
        onSuccess={handleChangePlanSuccess}
      />
    </div>
  );
}

