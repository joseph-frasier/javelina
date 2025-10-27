'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useToastStore } from '@/lib/toast-store';
import { SubscriptionManager } from '@/components/billing/SubscriptionManager';
import { PlanComparisonModal } from '@/components/billing/PlanComparisonModal';

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addToast = useToastStore((state) => state.addToast);
  
  const [orgId, setOrgId] = useState<string | null>(null);
  const [currentPlanCode, setCurrentPlanCode] = useState<string>('free');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/settings/billing');
      return;
    }

    // Get org_id from query params or first available org
    const orgIdParam = searchParams.get('org_id');
    
    if (orgIdParam) {
      setOrgId(orgIdParam);
      fetchCurrentPlan(orgIdParam);
    } else {
      // TODO: Fetch user's organizations and use the first one
      // For now, show error
      addToast('error', 'Please select an organization');
      setLoading(false);
    }
  }, [isAuthenticated, searchParams]);

  const fetchCurrentPlan = async (orgId: string) => {
    try {
      const response = await fetch(`/api/subscriptions/current?org_id=${orgId}`);
      const data = await response.json();

      if (response.ok && data.plan) {
        setCurrentPlanCode(data.plan.code);
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
    if (!orgId) return;

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
    if (!orgId) return;

    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription? You will still have access until the end of your billing period.'
    );

    if (!confirmed) return;

    try {
      // For now, redirect to customer portal where they can cancel
      handleManageBilling();
      
      // TODO: Implement direct cancellation API
      // const response = await fetch('/api/subscriptions/cancel', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ org_id: orgId }),
      // });
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      addToast('error', error.message || 'Failed to cancel subscription');
    }
  };

  const handleSelectPlan = async (planCode: string, priceId: string) => {
    if (!orgId) return;

    setShowPlanModal(false);

    if (planCode === 'free') {
      // Downgrading to free - handle via customer portal
      addToast('info', 'Please use the billing portal to downgrade to free');
      handleManageBilling();
      return;
    }

    // Redirect to checkout for paid plans
    const plan = {
      name: planCode.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      price: planCode === 'basic_monthly' ? 3.50 : planCode === 'pro_monthly' ? 6.70 : 450,
    };

    router.push(
      `/checkout?org_id=${orgId}&price_id=${priceId}&plan_name=${encodeURIComponent(plan.name)}&plan_price=${plan.price}&billing_interval=month`
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-yellow-800 mb-2">
            No Organization Selected
          </h2>
          <p className="text-sm text-yellow-700">
            Please select an organization to view billing information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-orange-dark mb-2">
            Billing & Subscription
          </h1>
          <p className="text-base text-gray-slate">
            Manage your subscription, view usage, and update billing information
          </p>
        </div>

        {/* Subscription Manager */}
        <SubscriptionManager
          orgId={orgId}
          onChangePlan={handleChangePlan}
          onManageBilling={handleManageBilling}
          onCancelSubscription={handleCancelSubscription}
        />
      </div>

      {/* Plan Comparison Modal */}
      <PlanComparisonModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        currentPlanCode={currentPlanCode}
        onSelectPlan={handleSelectPlan}
      />
    </>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}

