'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';

interface Plan {
  code: string;
  name: string;
  price: number;
  billing_interval: 'month' | 'year' | null;
  features: string[];
  isCurrent?: boolean;
  isPopular?: boolean;
}

interface PlanComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanCode: string;
  onSelectPlan: (planCode: string) => void;
}

// Plan definitions (Founder Tier Lifetime Plans)
const AVAILABLE_PLANS: Plan[] = [
  {
    code: 'starter_lifetime',
    name: 'Starter',
    price: 238.80,
    billing_interval: null,
    isPopular: true,
    features: [
      '1 Environment',
      '3 DNS Zones',
      '100 DNS Records per Zone',
      '2 Team Members',
      'Email Support',
    ],
  },
  {
    code: 'pro_lifetime',
    name: 'Pro',
    price: 1198.80,
    billing_interval: null,
    isPopular: false,
    features: [
      '3 Environments',
      '10 DNS Zones',
      '500 DNS Records per Zone',
      '5 Team Members',
      'Bulk Operations',
      'Export Data',
      'API Access',
      'Email Support',
    ],
  },
  {
    code: 'premium_lifetime',
    name: 'Premium',
    price: 4776.00,
    billing_interval: null,
    features: [
      '10 Environments',
      '50 DNS Zones',
      '5,000 DNS Records per Zone',
      '10 Team Members',
      'API Access',
      'Advanced Analytics',
      'Priority Support',
      'Audit Logs',
      'Bulk Operations',
      'Export Data',
    ],
  },
  {
    code: 'enterprise_lifetime',
    name: 'Enterprise',
    price: 0,
    billing_interval: null,
    features: [
      'Unlimited Everything',
      'Custom Roles',
      'SSO / SAML',
      'Dedicated Support',
      'SLA Guarantee',
      'Custom Integrations',
      'White-label Options',
    ],
  },
];

export function PlanComparisonModal({
  isOpen,
  onClose,
  currentPlanCode,
  onSelectPlan,
}: PlanComparisonModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  
  // Feature flags for starter-only launch
  const { hideProPlans, hideBusinessPlans } = useFeatureFlags();
  
  // Always show all plans (no filtering), but mark some as "coming soon"
  const visiblePlans = AVAILABLE_PLANS;

  const handleSelectPlan = (plan: Plan) => {
    if (plan.code === currentPlanCode) {
      return; // Already on this plan
    }

    if (plan.code === 'enterprise_lifetime') {
      // Contact sales for enterprise
      window.location.href = 'mailto:sales@javelina.com?subject=Enterprise Plan Inquiry';
      return;
    }

    setSelectedPlan(plan.code);
    onSelectPlan(plan.code);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compare Plans"
      subtitle="Choose the plan that best fits your needs. You can upgrade or downgrade at any time."
      size="xlarge"
    >
      <div className="py-4">

        {/* Top 3 Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {visiblePlans.filter(plan => plan.code !== 'enterprise_lifetime').map((plan) => {
            const isCurrent = plan.code === currentPlanCode;
            const isUpgrade = plan.price > (visiblePlans.find(p => p.code === currentPlanCode)?.price || 0);
            const isComingSoon = 
              (hideProPlans && plan.code === 'pro_lifetime') || 
              (hideBusinessPlans && plan.code === 'premium_lifetime');

            return (
              <div
                key={plan.code}
                className={`relative rounded-lg border-2 p-4 transition-all flex flex-col ${
                  isCurrent
                    ? 'border-orange bg-orange-light'
                    : plan.isPopular
                    ? 'border-orange/50 bg-white'
                    : 'border-gray-light bg-white hover:border-orange/30'
                } ${isComingSoon ? 'opacity-60' : ''}`}
              >
                {/* Popular Badge */}
                {plan.isPopular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-orange text-white text-xs font-bold rounded-full">
                      POPULAR
                    </span>
                  </div>
                )}

                {/* Current Badge */}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                      CURRENT PLAN
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-orange-dark">
                    {plan.name}
                  </h3>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-gray-slate">
                      ${plan.price.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400 uppercase">ONE-TIME</p>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-4 flex-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-xs">
                      <svg
                        className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5 mr-2"
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
                      <span className="text-gray-slate">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full mt-auto px-4 py-2 text-base rounded-md font-medium border-2 border-orange text-orange-dark cursor-not-allowed opacity-60"
                  >
                    Current Plan
                  </button>
                ) : isComingSoon ? (
                  <button
                    disabled
                    className="w-full mt-auto px-4 py-2 text-base rounded-md font-medium border-2 border-gray-300 text-gray-500 cursor-not-allowed"
                    aria-disabled="true"
                  >
                    Coming soon
                  </button>
                ) : (
                  <Button
                    variant={isUpgrade ? 'primary' : 'outline'}
                    size="md"
                    className="w-full mt-auto"
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {isUpgrade
                      ? 'Upgrade'
                      : plan.code === 'enterprise_lifetime'
                      ? 'Contact Sales'
                      : 'Downgrade'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Enterprise Plan - Separate at Bottom */}
        {(() => {
          const plan = visiblePlans.find(p => p.code === 'enterprise_lifetime');
          if (!plan) return null;
          
          const isCurrent = plan.code === currentPlanCode;
          const isUpgrade = plan.price > (visiblePlans.find(p => p.code === currentPlanCode)?.price || 0);

          return (
            <div className="border-2 border-gray-light dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Left Side - Plan Info */}
                <div className="flex-1">
                  <div className="mb-3">
                    <h3 className="text-xl font-bold text-orange-dark dark:text-orange mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-gray-slate dark:text-gray-400">
                      For large-scale applications running Internet scale workloads.
                    </p>
                  </div>

                  {/* Features in columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start text-sm">
                        <svg
                          className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5 mr-2"
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
                        <span className="text-gray-slate dark:text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side - Action Button */}
                <div className="flex-shrink-0 md:w-48">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full px-4 py-2 text-base rounded-md font-medium border-2 border-orange text-orange-dark dark:text-orange cursor-not-allowed opacity-60"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      onClick={() => handleSelectPlan(plan)}
                    >
                      Contact Sales
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </Modal>
  );
}

