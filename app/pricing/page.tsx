'use client';

import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { PricingCard } from '@/components/stripe/PricingCard';
import { PLANS, useSubscriptionStore } from '@/lib/subscription-store';
import { useAuthStore } from '@/lib/auth-store';
import { useToastStore } from '@/lib/toast-store';
import Link from 'next/link';

export default function PricingPage() {
  const router = useRouter();
  const selectPlan = useSubscriptionStore((state) => state.selectPlan);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addToast = useToastStore((state) => state.addToast);
  const user = useAuthStore((state) => state.user);

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'free') {
      // Free plan - create Stripe customer and go to dashboard
      selectPlan(planId);
      
      try {
        // Create Stripe customer for future upgrades
        const response = await fetch('/api/stripe/create-customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user?.email || 'guest@example.com',
            name: user?.name || 'Guest User',
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('Failed to create Stripe customer:', data.error);
        } else {
          console.log('Stripe customer created:', data.customerId);
        }
      } catch (error) {
        console.error('Error creating Stripe customer:', error);
      }

      // Check if user is authenticated
      if (isAuthenticated) {
        // User is authenticated, go to dashboard
        addToast('success', 'Welcome to Javelina Free!');
        router.push('/?payment_complete=true');
      } else {
        // User needs to login/verify email first
        addToast('info', 'Please login to continue to your dashboard');
        router.push('/login');
      }
    } else if (planId === 'enterprise') {
      // Enterprise plan - redirect to contact/sales
      addToast('info', 'Please contact our sales team for Enterprise pricing');
      // In a real app, this would go to a contact form
      router.push('/pricing'); // For now, just stay on pricing
    } else {
      // Paid plan (basic/pro) - go to checkout
      selectPlan(planId as 'basic' | 'pro');
      router.push('/checkout');
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
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-black text-orange-dark mb-2">
            Choose Your Plan
          </h1>
          <p className="text-base text-gray-slate font-light max-w-2xl mx-auto">
            Start managing your DNS infrastructure with confidence. Select the
            plan that fits your needs.
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

