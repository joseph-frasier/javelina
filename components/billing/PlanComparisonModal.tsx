'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface Plan {
  code: string;
  name: string;
  price: number;
  billing_interval: 'month' | 'year' | null;
  features: string[];
  priceId: string;
  isCurrent?: boolean;
  isPopular?: boolean;
}

interface PlanComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanCode: string;
  onSelectPlan: (planCode: string, priceId: string) => void;
}

// Plan definitions (should match your actual plans)
const AVAILABLE_PLANS: Plan[] = [
  {
    code: 'free',
    name: 'Free',
    price: 0,
    billing_interval: null,
    priceId: 'price_1SL5MCA8kaNOs7rye16c39RS',
    features: [
      '1 Environment',
      '3 DNS Zones',
      '100 DNS Records per Zone',
      '2 Team Members',
      'Community Support',
    ],
  },
  {
    code: 'basic_monthly',
    name: 'Basic',
    price: 3.50,
    billing_interval: 'month',
    priceId: 'price_1SL5NJA8kaNOs7rywCjYzPgH',
    features: [
      '3 Environments',
      '10 DNS Zones',
      '500 DNS Records per Zone',
      '5 Team Members',
      'Bulk Operations',
      'Export Data',
      'Email Support',
    ],
  },
  {
    code: 'pro_monthly',
    name: 'Pro',
    price: 6.70,
    billing_interval: 'month',
    priceId: 'price_1SLSXKA8kaNOs7ryKJ6hCHd5',
    isPopular: true,
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
    code: 'enterprise_monthly',
    name: 'Enterprise',
    price: 450,
    billing_interval: 'month',
    priceId: 'price_1SLSZFA8kaNOs7rywWLjhQ8b',
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

  const handleSelectPlan = (plan: Plan) => {
    if (plan.code === currentPlanCode) {
      return; // Already on this plan
    }

    if (plan.code === 'enterprise_monthly') {
      // Contact sales for enterprise
      window.location.href = 'mailto:sales@javelina.com?subject=Enterprise Plan Inquiry';
      return;
    }

    setSelectedPlan(plan.code);
    onSelectPlan(plan.code, plan.priceId);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compare Plans"
      size="xl"
    >
      <div className="py-4">
        <p className="text-sm text-gray-slate mb-6">
          Choose the plan that best fits your needs. You can upgrade or downgrade at any time.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {AVAILABLE_PLANS.map((plan) => {
            const isCurrent = plan.code === currentPlanCode;
            const isUpgrade = plan.price > (AVAILABLE_PLANS.find(p => p.code === currentPlanCode)?.price || 0);

            return (
              <div
                key={plan.code}
                className={`relative rounded-lg border-2 p-4 transition-all ${
                  isCurrent
                    ? 'border-orange bg-orange-light'
                    : plan.isPopular
                    ? 'border-orange/50 bg-white'
                    : 'border-gray-light bg-white hover:border-orange/30'
                }`}
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
                  <h3 className="text-lg font-bold text-orange-dark mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-3xl font-black text-orange-dark">
                      ${plan.price}
                    </span>
                    {plan.billing_interval && (
                      <span className="text-gray-slate ml-1 text-sm">
                        /{plan.billing_interval}
                      </span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-4 min-h-[200px]">
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
                <Button
                  variant={isCurrent ? 'outline' : isUpgrade ? 'primary' : 'outline'}
                  size="md"
                  className="w-full"
                  disabled={isCurrent}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {isCurrent
                    ? 'Current Plan'
                    : isUpgrade
                    ? 'Upgrade'
                    : plan.code === 'enterprise_monthly'
                    ? 'Contact Sales'
                    : 'Downgrade'}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Money Back Guarantee */}
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <div>
              <p className="text-sm font-bold text-green-800">14-Day Money-Back Guarantee</p>
              <p className="text-xs text-green-700 mt-1">
                Not satisfied with your upgrade? Get a full refund within 14 days, no questions asked.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

