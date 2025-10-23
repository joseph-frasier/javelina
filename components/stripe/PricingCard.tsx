'use client';

import { clsx } from 'clsx';
import Button from '@/components/ui/Button';
import type { Plan } from '@/lib/subscription-store';

interface PricingCardProps {
  plan: Plan;
  highlighted?: boolean;
  onSelect: (planId: string) => void;
  disabled?: boolean;
}

export function PricingCard({
  plan,
  highlighted = false,
  onSelect,
  disabled = false,
}: PricingCardProps) {
  return (
    <div
      className={clsx(
        'relative rounded-xl border-2 bg-white p-8 shadow-lg transition-all hover:shadow-xl',
        highlighted
          ? 'border-orange scale-105'
          : 'border-gray-light hover:border-orange/50',
        disabled && 'opacity-60 pointer-events-none'
      )}
    >
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-orange px-4 py-1 text-sm font-medium text-white">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-2xl font-bold text-orange-dark mb-2">
          {plan.name}
        </h3>
        <p className="text-sm text-gray-slate font-light">{plan.description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline">
          <span className="text-5xl font-black text-orange-dark">
            ${plan.price}
          </span>
          {plan.price > 0 && (
            <span className="ml-2 text-gray-slate font-light">
              /{plan.interval}
            </span>
          )}
        </div>
      </div>

      <Button
        variant={highlighted ? 'primary' : 'outline'}
        size="lg"
        className="w-full mb-8"
        onClick={() => onSelect(plan.id)}
        disabled={disabled}
      >
        {plan.price === 0 ? 'Get Started Free' : 'Select Plan'}
      </Button>

      <div className="space-y-4">
        <p className="text-sm font-medium text-orange-dark mb-4">
          What&apos;s included:
        </p>
        {plan.features.map((feature, index) => (
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
              {feature}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

