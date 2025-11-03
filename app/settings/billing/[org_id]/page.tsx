'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useToastStore } from '@/lib/toast-store';
import { SettingsLayout } from '@/components/layout/SettingsLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SubscriptionManager } from '@/components/billing/SubscriptionManager';
import { PlanComparisonModal } from '@/components/billing/PlanComparisonModal';
import { createClient } from '@/lib/supabase/client';

export default function OrganizationBillingPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.org_id as string | undefined;
  
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addToast = useToastStore((state) => state.addToast);
  
  const [organizationName, setOrganizationName] = useState<string>('');
  const [currentPlanCode, setCurrentPlanCode] = useState<string>('free');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

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

      if (memberError || !membership || !['Admin', 'SuperAdmin'].includes(membership.role)) {
        addToast('error', 'You do not have permission to manage billing for this organization');
        router.push('/settings/billing');
        return;
      }

      setHasAccess(true);

      // Get organization name
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single();

      if (org) {
        setOrganizationName(org.name);
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
      const response = await fetch(`/api/subscriptions/current?org_id=${orgId}`);
      const data = await response.json();

      if (response.ok) {
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
        console.log('Fetched plan data:', data);
      }
    } catch (error) {
      console.error('Error fetching current plan:', error);
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
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session');
      }

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

  const handleSelectPlan = async (planCode: string, priceId: string) => {
    setShowPlanModal(false);

    if (planCode === 'free') {
      // Downgrading to free - handle via customer portal
      addToast('info', 'Please use the billing portal to downgrade to free');
      handleManageBilling();
      return;
    }

    // Check if this is an upgrade/downgrade (has existing subscription) or new subscription
    if (currentPlanCode && currentPlanCode !== 'free') {
      // Existing subscription - update it instead of creating new one
      try {
        addToast('info', 'Updating your subscription...');
        
        const response = await fetch('/api/stripe/update-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            org_id: orgId,
            new_price_id: priceId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update subscription');
        }

        addToast('success', 'Subscription updated successfully!');
        
        // Refresh the page to show updated plan
        window.location.reload();
      } catch (error: any) {
        console.error('Error updating subscription:', error);
        addToast('error', error.message || 'Failed to update subscription');
      }
    } else {
      // No existing subscription - redirect to checkout for new subscription
      const plan = {
        name: planCode.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        price: planCode === 'basic_monthly' ? 3.50 : planCode === 'pro_monthly' ? 6.70 : 450,
      };

      router.push(
        `/checkout?org_id=${orgId}&price_id=${priceId}&plan_name=${encodeURIComponent(plan.name)}&plan_price=${plan.price}&billing_interval=month`
      );
    }
  };

  if (loading || !hasAccess) {
    return (
      <ProtectedRoute>
      <SettingsLayout 
        activeSection="billing"
        onSectionChange={(sectionId) => router.push('/settings')}
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
        onSectionChange={(sectionId) => router.push('/settings')}
      >
        <div>
          {/* Header with Back Button */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/settings')}
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
            />
          )}
        </div>

        {/* Plan Comparison Modal */}
        <PlanComparisonModal
          isOpen={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          currentPlanCode={currentPlanCode}
          onSelectPlan={handleSelectPlan}
        />
      </SettingsLayout>
    </ProtectedRoute>
  );
}

