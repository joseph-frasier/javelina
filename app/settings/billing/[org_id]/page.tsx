'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useToastStore } from '@/lib/toast-store';
import { SettingsLayout } from '@/components/layout/SettingsLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SubscriptionManager } from '@/components/billing/SubscriptionManager';
import { ChangePlanModal } from '@/components/modals/ChangePlanModal';
import { EditBillingInfoModal } from '@/components/modals/EditBillingInfoModal';
import { createClient } from '@/lib/supabase/client';
import type { Organization } from '@/types/supabase';

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
      const supabase = createClient();
      
      // Verify user has admin access to this organization
      const { data: membership, error: memberError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', orgId)
        .eq('user_id', user.id)
        .single();

      if (memberError || !membership || !['Admin', 'SuperAdmin', 'BillingContact'].includes(membership.role)) {
        addToast('error', 'You do not have permission to manage billing for this organization');
        router.push('/settings/billing');
        return;
      }

      setHasAccess(true);

      // Get organization details including billing information
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (org) {
        setOrganizationName(org.name);
        setOrganizationData(org);
      }

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
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
              className="flex items-center text-gray-slate hover:text-orange-dark mb-4 transition-colors"
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
            <h2 className="text-2xl font-semibold text-orange-dark mb-1">
              {organizationName}
            </h2>
            <p className="text-sm text-gray-slate">
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

          {/* Billing Contact Information Section */}
          <div className="mt-6 bg-white rounded-xl border border-gray-light shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-orange-dark">Billing Contact Information</h3>
                <p className="text-sm text-gray-slate mt-1">
                  Contact details for billing and administrative purposes
                </p>
              </div>
              <button
                onClick={() => setShowEditBillingModal(true)}
                className="px-4 py-2 bg-orange text-white rounded-md font-medium hover:bg-orange-dark transition-colors"
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
                <h4 className="text-sm font-semibold text-orange-dark mb-3">Billing Contact</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-slate">Email</p>
                    <p className="text-sm text-orange-dark font-medium">
                      {organizationData?.billing_email || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-slate">Phone</p>
                    <p className="text-sm text-orange-dark font-medium">
                      {organizationData?.billing_phone || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-slate">Address</p>
                    <p className="text-sm text-orange-dark font-medium">
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
                <h4 className="text-sm font-semibold text-orange-dark mb-3">Administrative Contact</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-slate">Email</p>
                    <p className="text-sm text-orange-dark font-medium">
                      {organizationData?.admin_contact_email || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-slate">Phone</p>
                    <p className="text-sm text-orange-dark font-medium">
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

