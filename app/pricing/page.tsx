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

    if (planId === 'enterprise') {
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

    if (selectedPlanForOrg.id === 'enterprise') {
      // Enterprise plan - redirect to contact/sales
      addToast('info', 'Please contact our sales team for Enterprise pricing');
      return;
    }

    // All plans (including Starter) go through checkout
    const planConfig = PLANS_CONFIG.find(p => p.id === selectedPlanForOrg.id);
    if (planConfig && planConfig.monthly) {
      router.push(
        `/checkout?org_id=${orgId}&price_id=${planConfig.monthly.priceId}&plan_name=${encodeURIComponent(planConfig.name)}&plan_price=${planConfig.monthly.amount}&billing_interval=month`
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
        <div className="max-w-7xl mx-auto pl-2 pr-4 sm:pl-3 sm:pr-6 lg:pl-4 lg:pr-8 py-1">
          <Logo width={150} height={60} />
        </div>
      </div>

      {/* Main Content */}
      <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Pricing Cards Grid - Top 3 Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {PLANS_CONFIG.filter(plan => plan.id !== 'enterprise').map((plan) => {
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

        {/* Enterprise Plan - Bottom Section */}
        {PLANS_CONFIG.filter(plan => plan.id === 'enterprise').map((plan) => (
          <div key={plan.id} className="mb-8 bg-white rounded-xl p-4 border-2 border-gray-light shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Left: Plan Info */}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-orange-dark mb-1">
                  {plan.name}
                </h3>
                <p className="text-xs text-gray-slate font-light mb-3">
                  {plan.description}
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  {plan.features.filter(f => f.included).map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <svg
                        className="w-4 h-4 text-orange mr-2 flex-shrink-0 mt-0.5"
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
                      <span className="text-xs text-gray-slate font-regular">
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Button */}
              <div className="flex-shrink-0 md:w-48">
                <Button
                  variant="outline"
                  size="md"
                  className="w-full"
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  Contact Sales
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
                Do you offer a money-back guarantee?
              </h3>
              <p className="text-sm text-gray-slate font-regular">
                Yes! All plans come with a 14-day money-back guarantee. If you&apos;re not satisfied with Javelina, we&apos;ll refund your payment in full, no questions asked.
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

