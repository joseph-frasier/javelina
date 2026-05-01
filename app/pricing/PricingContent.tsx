'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PricingCard } from '@/components/stripe/PricingCard';
import Button from '@/components/ui/Button';
import { useSubscriptionStore, type PlanId } from '@/lib/subscription-store';
import { useAuthStore } from '@/lib/auth-store';
import { useToastStore } from '@/lib/toast-store';
import { AddOrganizationModal } from '@/components/modals/AddOrganizationModal';
import { getPlanById, fetchPlans, PLANS_CONFIG } from '@/lib/plans-config';
import type { Plan } from '@/lib/plans-config';
import { gsap } from 'gsap';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { PRICING_FAQS } from '@/lib/constants/faq';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';

export default function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get('onboarding') === 'true';
  const audienceParam = searchParams.get('audience');
  const audience: 'dns' | 'business' | null =
    audienceParam === 'dns' || audienceParam === 'business' ? audienceParam : null;
  const showBusinessSection = audience === null || audience === 'business';
  const showDnsSections = audience === null || audience === 'dns';
  const selectPlan = useSubscriptionStore((state) => state.selectPlan);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addToast = useToastStore((state) => state.addToast);
  const user = useAuthStore((state) => state.user);
  
  // Feature flags for starter-only launch
  const { hideProPlans, hideBusinessPlans } = useFeatureFlags();
  
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

  const handleOrgCreated = (orgId: string, orgName: string) => {
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

      const intakeSuffix = planConfig.productLine === 'business' ? '&intake=business' : '';
      const orgNameSuffix = planConfig.productLine === 'business' && orgName
        ? `&org_name=${encodeURIComponent(orgName)}`
        : '';
      router.push(
        `/checkout?org_id=${orgId}&plan_code=${planConfig.code}&price_id=${planConfig.monthly.priceId}&plan_name=${encodeURIComponent(planConfig.name)}&plan_price=${planConfig.monthly.amount}&billing_interval=${billingInterval}${intakeSuffix}${orgNameSuffix}`
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
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
          <span className="text-text-muted">Loading pricing plans...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-alt">

      {/* Main Content */}
      <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
        <div className="mb-8">
          <Breadcrumb
            items={
              audience
                ? [
                    { label: 'Dashboard', href: '/' },
                    { label: 'Choose Plan Type', href: '/pricing/start' },
                    {
                      label:
                        audience === 'business'
                          ? 'Business Services'
                          : 'Javelina DNS',
                    },
                  ]
                : [
                    { label: 'Dashboard', href: '/' },
                    { label: 'Select Plan' },
                  ]
            }
          />
        </div>

        {/* Hero Section */}
        <section className="text-center mb-12" aria-labelledby="pricing-hero-heading">
          <h1 id="pricing-hero-heading" className="text-3xl font-black text-text mb-2">
            {audience === 'dns'
              ? 'Javelina DNS Plans'
              : audience === 'business'
              ? 'Business Services Plans'
              : isOnboarding
              ? 'Choose Your Plan'
              : 'Pricing Plans'}
          </h1>
          <p className="text-base text-text-muted font-light max-w-2xl mx-auto">
            {audience === 'dns'
              ? 'Self-manage your DNS infrastructure. Pick a tier that fits your needs.'
              : audience === 'business'
              ? 'Fully managed bundles: domain, DNS, email, and website, done for you.'
              : isOnboarding
              ? 'Select the plan that best fits your needs. You can upgrade or downgrade anytime.'
              : 'Start managing your DNS infrastructure with confidence. Select the plan that fits your needs.'}
          </p>
        </section>



        {/* Business Services Section */}
        {showBusinessSection && (
        <section className="mb-12" aria-labelledby="business-services-heading">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {PLANS_CONFIG.filter((plan) => plan.productLine === 'business').map((plan) => {
              const planForCard = {
                id: plan.id,
                name: plan.name,
                price: plan.monthly?.amount || 0,
                priceId: plan.monthly?.priceId || '',
                interval: 'month' as const,
                features: plan.features.filter((f) => f.included).map((f) => f.name),
                description: plan.description,
                popular: plan.popular,
              };
              return (
                <PricingCard
                  key={plan.id}
                  plan={planForCard}
                  highlighted={false}
                  onSelect={handleSelectPlan}
                  hidePrice={false}
                  comingSoon={false}
                />
              );
            })}
          </div>
        </section>
        )}

        {/* Monthly Subscription Plans Section */}
        {showDnsSections && (
        <section className="mb-12" aria-labelledby="monthly-plans-heading">
          <div className="text-center mb-6">
            <h2 id="monthly-plans-heading" className="text-2xl font-bold text-text mb-2">
              Monthly Subscriptions
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS_CONFIG.filter(plan => {
              // Filter out enterprise
              if (plan.id === 'enterprise') return false;
              // Exclude business-line plans (shown in the Business Services section above)
              if (plan.productLine === 'business') return false;
              // Only include monthly subscription plans (not lifetime) - always show all 3: starter, pro, business
              if (plan.code.includes('_lifetime')) return false;
              return true;
            }).map((plan) => {
              // Determine if this plan should be shown as "coming soon"
              const isComingSoon = 
                (hideProPlans && plan.code === 'pro') || 
                (hideBusinessPlans && plan.code === 'business');
              
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
                  comingSoon={isComingSoon}
                />
              );
            })}
          </div>
        </section>
        )}

        {/* Enterprise Lifetime Plan - Full Width */}
        {/* {PLANS_CONFIG.filter(plan => plan.id === 'enterprise_lifetime').map((plan) => (
          <div key={plan.id} className="mb-12 bg-white rounded-xl p-6 border-2 border-gray-light shadow-lg">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              {/* Left: Plan Info */}
              {/* <div className="flex-1">
                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-accent mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-text-muted font-light">
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
                      <span className="text-sm text-text-muted font-regular">
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div> */}

              {/* Right: Button */}
              {/* <div className="flex-shrink-0 md:w-56 flex flex-col items-center md:items-end justify-center">
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
        ))} */}

        {/* Lifetime Plans Section */}
        {showDnsSections && (
        <section className="mb-12" aria-labelledby="lifetime-plans-heading">
          <div className="text-center mb-6">
            <h2 id="lifetime-plans-heading" className="text-2xl font-bold text-text mb-2">
              Lifetime Plans
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS_CONFIG.filter(plan => {
              // Filter out enterprise lifetime
              if (plan.id === 'enterprise_lifetime') return false;
              // Only include lifetime plans (always show all 3: starter, pro, premium)
              if (!plan.code.includes('_lifetime')) return false;
              return true;
            }).map((plan) => {
              // Determine if this plan should be shown as "coming soon"
              const isComingSoon = 
                (hideProPlans && plan.code === 'pro_lifetime') || 
                (hideBusinessPlans && plan.code === 'premium_lifetime');
              
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
                  comingSoon={isComingSoon}
                />
              );
            })}
          </div>
        </section>
        )}

        {/* Enterprise Subscription Plan - Full Width Bottom Section */}
        {/* {PLANS_CONFIG.filter(plan => plan.id === 'enterprise').map((plan) => (
          <div key={plan.id} className="mb-8 bg-white rounded-xl p-6 border-2 border-gray-light shadow-lg">
            <div className="flex flex-col md:flex-row md:items-start md:items-between gap-6">
              {/* Left: Plan Info */}
              {/* <div className="flex-1">
                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-accent mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-text-muted font-light">
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
                      <span className="text-sm text-text-muted font-regular">
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div> */}

              {/* Right: Button */}
              {/* <div className="flex-shrink-0 md:w-56 flex flex-col items-center md:items-end justify-center">
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
        ))} */}

        {/* FAQ Section */}
        <section className="mt-8 max-w-3xl mx-auto" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-bold text-text text-center mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4" role="list">
            {PRICING_FAQS.map((faq, index) => (
              <article
                key={index}
                className="bg-white rounded-lg border border-gray-light p-4"
                role="listitem"
              >
                <h3 className="text-base font-bold text-text mb-1">
                  {faq.question}
                </h3>
                <p className="text-sm text-text-muted font-regular">
                  {faq.answer}
                </p>
              </article>
            ))}
          </div>
        </section>
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

