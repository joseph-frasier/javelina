'use client';

import { clsx } from 'clsx';
import Button from '@/components/ui/Button';
import type { Plan } from '@/lib/subscription-store';

interface PricingCardProps {
  plan: Plan;
  highlighted?: boolean;
  onSelect: (planId: string) => void;
  disabled?: boolean;
  hidePrice?: boolean;
}

export function PricingCard({
  plan,
  highlighted = false,
  onSelect,
  disabled = false,
  hidePrice = false,
}: PricingCardProps) {
  return (
    <div
      className={clsx(
        'relative rounded-xl border-2 bg-white p-5 shadow-lg transition-all hover:shadow-xl',
        highlighted
          ? 'border-orange scale-105'
          : 'border-gray-light hover:border-orange/50',
        disabled && 'opacity-60 pointer-events-none'
      )}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-orange px-3 py-0.5 text-xs font-medium text-white">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-bold text-orange-dark mb-1">
          {plan.name}
        </h3>
        <p className="text-xs text-gray-slate font-light">{plan.description}</p>
      </div>

      {!hidePrice && (
        <div className="mb-4">
          <div className="flex items-baseline">
            <span className="text-4xl font-black text-orange-dark">
              ${plan.price}
            </span>
            {plan.price > 0 && (
              <span className="ml-2 text-sm text-gray-slate font-light">
                /{plan.interval}
              </span>
            )}
          </div>
        </div>
      )}

      <Button
        variant={highlighted ? 'primary' : 'outline'}
        size="md"
        className="w-full mb-5"
        onClick={() => onSelect(plan.id)}
        disabled={disabled}
      >
        {plan.price === 0 ? 'Get Started Free' : 'Select Plan'}
      </Button>

      <div className="space-y-2.5">
        <p className="text-xs font-medium text-orange-dark mb-3">
          What&apos;s included:
        </p>
        {plan.features.map((feature, index) => (
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
              {feature}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

