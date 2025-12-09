'use client';

import { useState, Suspense, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { PricingCard } from '@/components/stripe/PricingCard';
import Button from '@/components/ui/Button';
import { useSubscriptionStore, type PlanId } from '@/lib/subscription-store';
import { useAuthStore } from '@/lib/auth-store';
import { useToastStore } from '@/lib/toast-store';
import { AddOrganizationModal } from '@/components/modals/AddOrganizationModal';
import { getPlanById, fetchPlans, PLANS_CONFIG } from '@/lib/plans-config';
import type { Plan } from '@/lib/plans-config';
import Link from 'next/link';
import { gsap } from 'gsap';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get('onboarding') === 'true';
  const selectPlan = useSubscriptionStore((state) => state.selectPlan);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addToast = useToastStore((state) => state.addToast);
  const user = useAuthStore((state) => state.user);
  
  // Refs for GSAP animation
  const contentRef = useRef<HTMLDivElement>(null);
  const [isInitialMount, setIsInitialMount] = useState(true);
  const [plansLoaded, setPlansLoaded] = useState(false);
  
  // Modal state
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [selectedPlanForOrg, setSelectedPlanForOrg] = useState<Plan | null>(null);
  
  // Fetch plans from database on mount
  useEffect(() => {
    const loadPlans = async () => {
      try {
        await fetchPlans();
        setPlansLoaded(true);
      } catch (error) {
        console.error('Failed to load plans:', error);
        addToast('error', 'Failed to load pricing plans');
      }
    };
    loadPlans();
  }, [addToast]);
  
  // GSAP page transition animation on mount
  useEffect(() => {
    if (contentRef.current && isInitialMount) {
      gsap.fromTo(
        contentRef.current,
        {
          opacity: 0,
          x: 30,
        },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: 'power2.out',
          onComplete: () => {
            setIsInitialMount(false);
          }
        }
      );
    }
  }, [isInitialMount]);

  const handleSelectPlan = async (planId: string) => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      addToast('info', 'Please login to continue');
      router.push('/login?redirect=/pricing');
      return;
    }

    if (planId === 'enterprise_lifetime' || planId === 'enterprise') {
      // Enterprise plan - redirect to contact/sales
      addToast('info', 'Please contact our sales team for Enterprise pricing');
      // In a real app, this would go to a contact form
      return;
    }

    // Get the full plan configuration
    const plan = getPlanById(PLANS_CONFIG, planId);
    if (!plan) {
      addToast('error', 'Invalid plan selected');
      return;
    }

    // Store selected plan and show organization creation modal
    selectPlan(planId as PlanId);
    setSelectedPlanForOrg(plan);
    setShowOrgModal(true);
  };

  const handleOrgCreated = (orgId: string) => {
    // Organization created successfully
    if (!selectedPlanForOrg) return;

    if (selectedPlanForOrg.id === 'enterprise_lifetime' || selectedPlanForOrg.id === 'enterprise') {
      // Enterprise plan - redirect to contact/sales
      addToast('info', 'Please contact our sales team for Enterprise pricing');
      return;
    }

    // All plans (including Starter) go through checkout
    const planConfig = PLANS_CONFIG.find(p => p.id === selectedPlanForOrg.id);
    if (planConfig && planConfig.monthly) {
      // Determine billing interval based on plan code
      const isLifetime = planConfig.code.includes('_lifetime');
      const billingInterval = isLifetime ? 'lifetime' : planConfig.monthly.interval;
      
      router.push(
        `/checkout?org_id=${orgId}&plan_code=${planConfig.code}&price_id=${planConfig.monthly.priceId}&plan_name=${encodeURIComponent(planConfig.name)}&plan_price=${planConfig.monthly.amount}&billing_interval=${billingInterval}`
      );
    } else {
      addToast('error', 'Unable to proceed to checkout. Please try again.');
    }

    // Clean up
    setShowOrgModal(false);
    setSelectedPlanForOrg(null);
  };

  // Show loading state while plans are being fetched
  if (!plansLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-light">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
          <span className="text-orange-dark">Loading pricing plans...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-light">
      {/* Header */}
      <div className="border-b border-gray-light bg-white">
        <div className="max-w-7xl mx-auto pl-2 pr-4 sm:pl-3 sm:pr-6 lg:pl-4 lg:pr-8 py-1 flex items-center justify-between">
          <Link href="/" className="inline-block cursor-pointer">
            <Logo width={150} height={60} />
          </Link>
          <Breadcrumb 
            items={[
              { label: 'Dashboard', href: '/' },
              { label: 'Select Plan' }
            ]}
          />
        </div>
      </div>

      {/* Main Content */}
      <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

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

        {/* Lifetime Plans Section */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-orange-dark mb-2">
              Lifetime Plans
            </h2>
            <p className="text-sm text-gray-slate font-light">
              Pay once, own forever. No recurring fees.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS_CONFIG.filter(plan => 
              plan.code.includes('_lifetime') && 
              plan.id !== 'enterprise_lifetime'
            ).map((plan) => {
              const planForCard = {
                id: plan.id,
                name: plan.name,
                price: plan.monthly?.amount || 0,
                priceId: plan.monthly?.priceId || '',
                interval: 'lifetime' as const,
                features: plan.features.filter(f => f.included).map(f => f.name),
                description: plan.description,
                popular: plan.popular,
              };
              return (
                <PricingCard
                  key={plan.id}
                  plan={planForCard}
                  highlighted={plan.popular}
                  onSelect={handleSelectPlan}
                  hidePrice={false}
                />
              );
            })}
          </div>
        </div>

        {/* Enterprise Lifetime Plan - Full Width */}
        {PLANS_CONFIG.filter(plan => plan.id === 'enterprise_lifetime').map((plan) => (
          <div key={plan.id} className="mb-12 bg-white rounded-xl p-6 border-2 border-gray-light shadow-lg">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              {/* Left: Plan Info */}
              <div className="flex-1">
                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-orange-dark mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-slate font-light">
                    {plan.description}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3">
                  {plan.features.filter(f => f.included).map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <svg
                        className="w-5 h-5 text-orange mr-3 flex-shrink-0 mt-0.5"
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
                      <span className="text-sm text-gray-slate font-regular">
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Button */}
              <div className="flex-shrink-0 md:w-56 flex flex-col items-center md:items-end justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full md:w-auto px-8"
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Monthly Subscription Plans Section */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-orange-dark mb-2">
              Monthly Subscriptions
            </h2>
            <p className="text-sm text-gray-slate font-light">
              Flexible monthly billing. Cancel anytime.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS_CONFIG.filter(plan => 
              !plan.code.includes('_lifetime') && 
              plan.id !== 'enterprise'
            ).map((plan) => {
              const planForCard = {
                id: plan.id,
                name: plan.name,
                price: plan.monthly?.amount || 0,
                priceId: plan.monthly?.priceId || '',
                interval: 'month' as const,
                features: plan.features.filter(f => f.included).map(f => f.name),
                description: plan.description,
                popular: plan.popular,
              };
              return (
                <PricingCard
                  key={plan.id}
                  plan={planForCard}
                  highlighted={plan.popular}
                  onSelect={handleSelectPlan}
                  hidePrice={false}
                />
              );
            })}
          </div>
        </div>

        {/* Enterprise Subscription Plan - Full Width Bottom Section */}
        {PLANS_CONFIG.filter(plan => plan.id === 'enterprise').map((plan) => (
          <div key={plan.id} className="mb-8 bg-white rounded-xl p-6 border-2 border-gray-light shadow-lg">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              {/* Left: Plan Info */}
              <div className="flex-1">
                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-orange-dark mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-slate font-light">
                    {plan.description}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3">
                  {plan.features.filter(f => f.included).map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <svg
                        className="w-5 h-5 text-orange mr-3 flex-shrink-0 mt-0.5"
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
                      <span className="text-sm text-gray-slate font-regular">
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Button */}
              <div className="flex-shrink-0 md:w-56 flex flex-col items-center md:items-end justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full md:w-auto px-8"
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
        ))}

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
                Can I migrate my existing DNS records?
              </h3>
              <p className="text-sm text-gray-slate font-regular">
                Yes! You can easily import your existing DNS records from other providers. We support bulk imports via CSV and BIND zone file formats, making the migration process quick and seamless.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Creation Modal */}
      <AddOrganizationModal
        isOpen={showOrgModal}
        onClose={() => {
          setShowOrgModal(false);
          // Clear selected plan after animation completes
          setTimeout(() => {
            setSelectedPlanForOrg(null);
          }, 250);
        }}
        onSuccess={handleOrgCreated}
        selectedPlan={selectedPlanForOrg}
      />
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-orange-light">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
          <span className="text-orange-dark">Loading...</span>
        </div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}

