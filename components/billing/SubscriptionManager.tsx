'use client';

import { useState, useEffect, useCallback } from 'react';
import { UsageMeter } from './UsageMeter';
import type { CurrentSubscriptionResponse, OrgUsageWithLimits } from '@/types/billing';
import { formatLimit } from '@/types/billing';

interface SubscriptionManagerProps {
  orgId: string;
  onChangePlan?: () => void;
  onManageBilling?: () => void;
  onCancelSubscription?: () => void;
}

export function SubscriptionManager({
  orgId,
  onChangePlan,
  onManageBilling,
  onCancelSubscription,
}: SubscriptionManagerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<CurrentSubscriptionResponse | null>(null);
  const [usage, setUsage] = useState<OrgUsageWithLimits | null>(null);

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

      // Build usage data from entitlements
      const usageData: OrgUsageWithLimits = {
        org_id: orgId,
        environments_count: 0, // TODO: Fetch actual counts
        zones_count: 0,
        members_count: 0,
        environments_limit: null,
        zones_limit: null,
        members_limit: null,
        dns_records_limit: null,
      };

      // Parse entitlements to get limits
      if (data.entitlements) {
        data.entitlements.forEach((ent: any) => {
          const value = parseInt(ent.value, 10);
          switch (ent.entitlement_key) {
            case 'environments_limit':
              usageData.environments_limit = value;
              break;
            case 'zones_limit':
              usageData.zones_limit = value;
              break;
            case 'team_members_limit':
              usageData.members_limit = value;
              break;
            case 'dns_records_limit':
              usageData.dns_records_limit = value;
              break;
          }
        });
      }

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
          {/* Only show buttons for regular subscription plans */}
          {subscription?.plan?.billing_interval !== null && (
            <div className="flex flex-wrap gap-3">
              {onChangePlan && (
                <button
                  onClick={onChangePlan}
                  className="px-4 py-2 bg-orange text-white rounded-md font-medium hover:bg-orange-dark transition-colors"
                >
                  Change Plan
                </button>
              )}
              {onManageBilling && (
                <button
                  onClick={onManageBilling}
                  className="px-4 py-2 bg-orange text-white rounded-md font-medium hover:bg-orange-dark transition-colors"
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
            </div>
          )}
          
          {/* Lifetime plan message - only for lifetime plans */}
          {subscription?.plan?.billing_interval === null && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-900">
                <strong>Lifetime plan changes:</strong> To upgrade, downgrade, or modify your lifetime plan, please contact our sales team at{' '}
                <a href="mailto:sales@javelina.io" className="text-blue-600 hover:text-blue-700 underline font-medium">
                  sales@javelina.io
                </a>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Usage Meters */}
      {usage && (
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
      )}

      {/* Features List */}
      {subscription?.entitlements && subscription.entitlements.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-light shadow-sm p-6">
          <h3 className="text-lg font-bold text-orange-dark mb-4">Plan Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {subscription.entitlements
              .filter((ent) => ent.value_type === 'boolean')
              .map((ent) => {
                const enabled = ent.value === 'true';
                return (
                  <div key={ent.entitlement_key} className="flex items-center space-x-2">
                    {enabled ? (
                      <svg
                        className="w-5 h-5 text-green-600 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-gray-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                    <span className={`text-sm ${enabled ? 'text-orange-dark' : 'text-gray-slate'}`}>
                      {ent.entitlement_description || ent.entitlement_key.replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

