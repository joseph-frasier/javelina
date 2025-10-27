'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { PricingCard } from '@/components/stripe/PricingCard';
import { PLANS, useSubscriptionStore } from '@/lib/subscription-store';
import { useAuthStore } from '@/lib/auth-store';
import { useToastStore } from '@/lib/toast-store';
import Link from 'next/link';

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get('onboarding') === 'true';
  const selectPlan = useSubscriptionStore((state) => state.selectPlan);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addToast = useToastStore((state) => state.addToast);
  const user = useAuthStore((state) => state.user);

  const handleSelectPlan = async (planId: string) => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      addToast('info', 'Please login to continue');
      router.push('/login?redirect=/pricing');
      return;
    }

    if (planId === 'free') {
      // Free plan - create organization with free subscription
      selectPlan(planId);
      
      try {
        const response = await fetch('/api/organizations/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${user?.user_metadata?.name || user?.email?.split('@')[0] || 'My'} Organization`,
            plan_code: 'free',
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          addToast('error', data.error || 'Failed to create organization');
          return;
        }

        addToast('success', 'Welcome to Javelina Free!');
        router.push(`/organization/${data.org_id}`);
      } catch (error) {
        console.error('Error creating organization:', error);
        addToast('error', 'Failed to create organization');
      }
    } else if (planId === 'enterprise') {
      // Enterprise plan - redirect to contact/sales
      addToast('info', 'Please contact our sales team for Enterprise pricing');
      // In a real app, this would go to a contact form
      router.push('/pricing'); // For now, just stay on pricing
    } else {
      // Paid plan (basic/pro) - need to create organization first or select existing
      selectPlan(planId as 'basic' | 'pro');
      
      // For now, redirect to checkout with plan info
      // TODO: Add org selection modal if user has multiple orgs
      const plan = PLANS.find(p => p.id === planId);
      if (plan) {
        // Create a temporary organization for the paid plan
        // In production, you'd want to let users select an existing org or create new
        try {
          const response = await fetch('/api/organizations/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `${user?.user_metadata?.name || user?.email?.split('@')[0] || 'My'} Organization`,
              plan_code: 'free', // Start with free, will be upgraded after payment
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            addToast('error', data.error || 'Failed to create organization');
            return;
          }

          // Redirect to checkout with org_id and plan details
          router.push(
            `/checkout?org_id=${data.org_id}&price_id=${plan.priceId}&plan_name=${encodeURIComponent(plan.name)}&plan_price=${plan.price}&billing_interval=month`
          );
        } catch (error) {
          console.error('Error creating organization:', error);
          addToast('error', 'Failed to create organization');
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-orange-light">
      {/* Header */}
      <div className="border-b border-gray-light bg-white">
        <div className="max-w-7xl mx-auto pl-2 pr-4 sm:pl-3 sm:pr-6 lg:pl-4 lg:pr-8 py-1">
          <Logo width={150} height={60} />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Onboarding Welcome Banner */}
        {isOnboarding && (
          <div className="mb-8 bg-gradient-to-r from-orange to-orange-dark rounded-xl shadow-lg border border-orange p-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <svg
                  className="w-6 h-6 text-white mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h2 className="text-xl font-bold text-white">
                  Welcome to Javelina! 🎉
                </h2>
              </div>
              <p className="text-white/90 text-sm">
                Your email has been verified. Choose a plan below to start managing your DNS infrastructure.
              </p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-black text-orange-dark mb-2">
            {isOnboarding ? 'Choose Your Plan' : 'Pricing Plans'}
          </h1>
          <p className="text-base text-gray-slate font-light max-w-2xl mx-auto">
            {isOnboarding
              ? 'Select the plan that best fits your needs. You can upgrade or downgrade anytime.'
              : 'Start managing your DNS infrastructure with confidence. Select the plan that fits your needs.'}
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              highlighted={plan.popular}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-orange-dark text-center mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-light p-4">
              <h3 className="text-base font-bold text-orange-dark mb-1">
                Can I change my plan later?
              </h3>
              <p className="text-sm text-gray-slate font-regular">
                Yes! You can upgrade or downgrade your plan at any time. Changes
                will be prorated and reflected in your next billing cycle.
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-light p-4">
              <h3 className="text-base font-bold text-orange-dark mb-1">
                What payment methods do you accept?
              </h3>
              <p className="text-sm text-gray-slate font-regular">
                We accept all major credit cards (Visa, Mastercard, American
                Express) and support automatic billing for your convenience.
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-light p-4">
              <h3 className="text-base font-bold text-orange-dark mb-1">
                Is there a free trial?
              </h3>
              <p className="text-sm text-gray-slate font-regular">
                Our Free plan is available forever with no credit card required.
                For paid plans, we offer a 14-day money-back guarantee.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

