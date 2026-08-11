'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { SettingsLayout } from '@/components/layout/SettingsLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SubscriptionManager } from '@/components/billing/SubscriptionManager';
import { ChangePlanModal } from '@/components/modals/ChangePlanModal';
import { EditBillingInfoModal } from '@/components/modals/EditBillingInfoModal';
// No longer need Supabase client - using Express API with session cookies
import type { Organization } from '@/types/supabase';
import {
  discountsApi,
  ApiError,
  type CodeEvaluation,
  type RejectionReason,
} from '@/lib/api-client';
import {
  summarizeRules,
  summarizeDuration,
  alreadyAppliedDetail,
  ALREADY_APPLIED_SUMMARY,
} from '@/lib/discounts/format';
import { canManageBilling } from '@/lib/permissions';

type RedeemState =
  | { kind: 'none' }
  | { kind: 'applied'; summary: string; duration: string }
  | { kind: 'error'; message: string };

export default function OrganizationBillingPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const orgId = params?.org_id as string | undefined;
  
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addToast = useToastStore((state) => state.addToast);
  
  const [organizationName, setOrganizationName] = useState<string>('');
  const [organizationData, setOrganizationData] = useState<Organization | null>(null);
  const [currentPlanCode, setCurrentPlanCode] = useState<string>('free');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showEditBillingModal, setShowEditBillingModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Discount code redemption state
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemState, setRedeemState] = useState<RedeemState>({ kind: 'none' });

  // Redeeming writes pricing onto the org, and the backend requires a billing
  // role for it (requireOrgRole SuperAdmin/Admin/BillingContact on
  // POST /discounts/redeem). Mirror that here so an Editor or Viewer is not
  // offered a box that only fails after a successful preview. An org missing
  // from the profile (e.g. just created, store not yet refreshed) leaves the
  // box in place rather than hiding it from someone who can use it.
  const billingOrgRole = user?.organizations?.find((o) => o.id === orgId)?.role;
  const canRedeemCode = !billingOrgRole || canManageBilling(billingOrgRole);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/settings/billing');
      return;
    }

    if (!orgId) {
      addToast('error', 'Organization ID is required');
      router.push('/settings/billing');
      return;
    }

    verifyAccessAndFetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, orgId]);

  const verifyAccessAndFetchData = async () => {
    if (!orgId || !user?.id) {
      return;
    }
    try {
      // Fetch organization via Express API (includes user role)
      const { organizationsApi } = await import('@/lib/api-client');
      const org = await organizationsApi.get(orgId);

      if (!org) {
        addToast('error', 'Organization not found');
        router.push('/settings/billing');
        return;
      }

      // Check if user has billing access
      // Note: Backend should return user's role in the organization
      // For now, we'll trust that if they can fetch it, they have access
      // TODO: Backend should include userRole in organization response
      setHasAccess(true);
      setOrganizationName(org.name);
      setOrganizationData(org);

      // Fetch current plan
      await fetchCurrentPlan();
    } catch (error) {
      console.error('Error verifying access:', error);
      addToast('error', 'Failed to load billing information');
      router.push('/settings/billing');
    }
  };

  const fetchCurrentPlan = async () => {
    if (!orgId) return;

    try {
      // Use the API client to route through the Express backend
      const { subscriptionsApi } = await import('@/lib/api-client');
      const data = await subscriptionsApi.getCurrent(orgId);

      // Check if we have subscription data with a plan_code
      if (data.subscription && data.subscription.plan_code) {
        setCurrentPlanCode(data.subscription.plan_code);
      } else if (data.plan && data.plan.code) {
        // Fallback to plan object
        setCurrentPlanCode(data.plan.code);
      } else {
        // No subscription found, default to free
        setCurrentPlanCode('free');
      }
      
      // Check if we should auto-open the modal (from query parameter)
      const shouldOpenModal = searchParams.get('openModal');
      if (shouldOpenModal === 'true') {
        setShowPlanModal(true);
        // Clean up URL
        router.replace(`/settings/billing/${orgId}`, { scroll: false });
      }
    } catch (error) {
      console.error('Error fetching current plan:', error);
      setCurrentPlanCode('free');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = () => {
    setShowPlanModal(true);
  };

  const handleManageBilling = async () => {
    if (!orgId) {
      addToast('error', 'Organization ID is required');
      return;
    }

    try {
      const { stripeApi } = await import('@/lib/api-client');
      const data = await stripeApi.createPortalSession(orgId);

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Error opening billing portal:', error);
      addToast('error', error.message || 'Failed to open billing portal');
    }
  };

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription? You will still have access until the end of your billing period.'
    );

    if (!confirmed) return;

    try {
      // Redirect to customer portal where they can cancel
      handleManageBilling();
      
      // TODO: Implement direct cancellation API
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      addToast('error', error.message || 'Failed to cancel subscription');
    }
  };

  const handleChangePlanSuccess = async () => {
    // This is called after the ChangePlanModal successfully updates the plan
    // The modal already handles the API call and waiting for webhook
    // Refresh both the page's plan data and trigger SubscriptionManager to refresh
    await fetchCurrentPlan();
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEditBillingSuccess = async () => {
    // Refresh organization data after billing info is updated
    await verifyAccessAndFetchData();
    setRefreshTrigger(prev => prev + 1);
  };

  // Validate then redeem a discount code onto this org. Unlike checkout,
  // there is no separate preview step to hold for later — an org that
  // already has a plan never passes back through checkout, so this is the
  // only place domain- and mailbox-only codes can ever be redeemed.
  const handleRedeemCode = async () => {
    if (isRedeeming || !redeemCode.trim() || !orgId) return;

    setIsRedeeming(true);

    try {
      const evaluation: CodeEvaluation = await discountsApi.validate(redeemCode.trim(), orgId);

      if (evaluation.status === 'valid') {
        try {
          const { rules } = await discountsApi.redeem(redeemCode.trim(), orgId);
          setRedeemState({
            kind: 'applied',
            summary: summarizeRules(rules),
            duration: summarizeDuration(evaluation.code),
          });
          setRedeemCode('');
          addToast('success', 'Discount code applied!');
          // Re-fetch the plan/pricing data that SubscriptionManager and this
          // page render, rather than hand-patching local state from the
          // redeem response, so the granted rules appear in the existing
          // effective-pricing display.
          await fetchCurrentPlan();
          setRefreshTrigger((prev) => prev + 1);
        } catch (redeemError) {
          const details = (redeemError as ApiError).details as
            | { reason?: RejectionReason; message?: string }
            | undefined;
          const message =
            details?.message ||
            (redeemError instanceof Error ? redeemError.message : 'Failed to redeem discount code');
          setRedeemState({ kind: 'error', message });
        }
      } else if (evaluation.status === 'already_applied') {
        // Nothing was redeemed here — validate answered `already_applied`, so
        // the redeem call above never ran. The headline has to say so: this
        // box is the same green success panel a fresh grant renders, and
        // leading with the rule summary made a spent code look newly applied.
        setRedeemState({
          kind: 'applied',
          summary: ALREADY_APPLIED_SUMMARY,
          duration: alreadyAppliedDetail(evaluation.rules, evaluation.code),
        });
        setRedeemCode('');
      } else {
        setRedeemState({ kind: 'error', message: evaluation.message });
      }
    } catch (error) {
      setRedeemState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to validate discount code',
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  // Check if billing information is missing
  const isBillingInfoMissing = organizationData && (
    !organizationData.billing_email ||
    !organizationData.billing_phone ||
    !organizationData.billing_address ||
    !organizationData.billing_city ||
    !organizationData.billing_state ||
    !organizationData.billing_zip ||
    !organizationData.admin_contact_email ||
    !organizationData.admin_contact_phone
  );

  if (loading || !hasAccess) {
    return (
      <ProtectedRoute>
      <SettingsLayout 
        activeSection="billing"
        onSectionChange={(sectionId) => router.push(`/settings?section=${sectionId}`)}
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      </SettingsLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SettingsLayout 
        activeSection="billing"
        onSectionChange={(sectionId) => router.push(`/settings?section=${sectionId}`)}
      >
        <div>
          {/* Header with Back Button */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/settings?section=billing')}
              className="flex items-center text-text-muted hover:text-text mb-4 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
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
              Back to Billing
            </button>
            <h2 className="text-2xl font-semibold text-text mb-1">
              {organizationName}
            </h2>
            <p className="text-sm text-text-muted">
              Manage subscription and billing information
            </p>
          </div>

          {/* Subscription Manager */}
          {orgId && (
            <SubscriptionManager
              orgId={orgId}
              onChangePlan={handleChangePlan}
              onManageBilling={handleManageBilling}
              onCancelSubscription={handleCancelSubscription}
              refreshTrigger={refreshTrigger}
            />
          )}

          {/* Redeem a Discount Code Section — billing roles only, matching the server */}
          {canRedeemCode && (
          <div className="mt-6 bg-surface rounded-xl border border-border shadow-sm p-6">
            <h3 className="text-xl font-bold text-text">Redeem a Code</h3>
            <p className="text-sm text-text-muted mt-1 mb-4">
              Have a discount code? Apply it to this organization.
            </p>

            {redeemState.kind === 'applied' ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-medium text-green-700 text-sm">{redeemState.summary}</p>
                    <p className="text-xs text-green-600">{redeemState.duration}</p>
                  </div>
                </div>
                <button
                  onClick={() => setRedeemState({ kind: 'none' })}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  aria-label="Redeem another code"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={redeemCode}
                  onChange={(e) => {
                    setRedeemCode(e.target.value.toUpperCase());
                    if (redeemState.kind === 'error') setRedeemState({ kind: 'none' });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRedeemCode();
                    }
                  }}
                  placeholder="Enter code"
                  aria-label="Discount code"
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  disabled={isRedeeming}
                />
                <button
                  onClick={handleRedeemCode}
                  disabled={!redeemCode.trim() || isRedeeming}
                  className="px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRedeeming ? (
                    <div className="flex items-center space-x-1">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    </div>
                  ) : (
                    'Apply'
                  )}
                </button>
              </div>
            )}
            {redeemState.kind === 'error' && (
              <p className="mt-2 text-sm text-red-600">{redeemState.message}</p>
            )}
          </div>
          )}

          {/* Billing Contact Information Section */}
          <div className="mt-6 bg-surface rounded-xl border border-border shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-text">Billing Contact Information</h3>
                <p className="text-sm text-text-muted mt-1">
                  Contact details for billing and administrative purposes
                </p>
              </div>
              <button
                onClick={() => setShowEditBillingModal(true)}
                className="px-4 py-2 bg-accent text-white rounded-md font-medium hover:bg-accent-hover transition-colors"
              >
                Edit Billing Info
              </button>
            </div>

            {isBillingInfoMissing && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Billing information incomplete
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Please complete your billing contact information to ensure uninterrupted service.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Billing Contact */}
              <div>
                <h4 className="text-sm font-semibold text-text mb-3">Billing Contact</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-text-muted">Email</p>
                    <p className="text-sm text-text font-medium">
                      {organizationData?.billing_email || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Phone</p>
                    <p className="text-sm text-text font-medium">
                      {organizationData?.billing_phone || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Address</p>
                    <p className="text-sm text-text font-medium">
                      {organizationData?.billing_address ? (
                        <>
                          {organizationData.billing_address}<br />
                          {organizationData.billing_city}, {organizationData.billing_state} {organizationData.billing_zip}
                        </>
                      ) : (
                        'Not set'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Admin Contact */}
              <div>
                <h4 className="text-sm font-semibold text-text mb-3">Administrative Contact</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-text-muted">Email</p>
                    <p className="text-sm text-text font-medium">
                      {organizationData?.admin_contact_email || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Phone</p>
                    <p className="text-sm text-text font-medium">
                      {organizationData?.admin_contact_phone || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Plan Modal */}
        {orgId && (
          <ChangePlanModal
            isOpen={showPlanModal}
            onClose={() => setShowPlanModal(false)}
            currentPlanCode={currentPlanCode}
            orgId={orgId}
            onSuccess={handleChangePlanSuccess}
          />
        )}

        {/* Edit Billing Info Modal */}
        {orgId && organizationData && (
          <EditBillingInfoModal
            isOpen={showEditBillingModal}
            onClose={() => setShowEditBillingModal(false)}
            organizationId={orgId}
            organizationName={organizationName}
            currentData={{
              billing_phone: organizationData.billing_phone,
              billing_email: organizationData.billing_email,
              billing_address: organizationData.billing_address,
              billing_city: organizationData.billing_city,
              billing_state: organizationData.billing_state,
              billing_zip: organizationData.billing_zip,
              admin_contact_email: organizationData.admin_contact_email,
              admin_contact_phone: organizationData.admin_contact_phone,
            }}
            onSuccess={handleEditBillingSuccess}
          />
        )}
      </SettingsLayout>
    </ProtectedRoute>
  );
}

