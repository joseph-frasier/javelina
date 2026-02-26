'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { plansApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';

interface PendingCheckoutBannerProps {
  orgId: string;
  pendingPlanCode: string;
  pendingPriceId: string | null;
  className?: string;
}

export function PendingCheckoutBanner({
  orgId,
  pendingPlanCode,
  pendingPriceId,
  className = '',
}: PendingCheckoutBannerProps) {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleCompletePayment = async () => {
    setIsLoading(true);
    try {
      const plan = await plansApi.getByCode(pendingPlanCode);
      const planData = plan.data || plan;

      const priceId = pendingPriceId || planData.metadata?.price_id || '';
      const planName = planData.name || pendingPlanCode;
      const planPrice = planData.metadata?.price || '0';
      const isLifetime = pendingPlanCode.includes('_lifetime');
      const billingInterval = isLifetime
        ? 'lifetime'
        : planData.billing_interval || 'month';

      const params = new URLSearchParams({
        org_id: orgId,
        plan_code: pendingPlanCode,
        price_id: priceId,
        plan_name: planName,
        plan_price: String(planPrice),
        billing_interval: billingInterval,
      });

      router.push(`/checkout?${params.toString()}`);
    } catch (error) {
      console.error('Failed to load plan details:', error);
      addToast('error', 'Failed to load plan details. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <svg
          className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400">
            Payment Incomplete
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Your organization setup is incomplete. Complete payment to unlock all
            features. All organization actions are disabled until payment is
            finalized.
          </p>
        </div>
        <button
          onClick={handleCompletePayment}
          disabled={isLoading}
          className="flex-shrink-0 inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Loading...
            </div>
          ) : (
            'Complete Payment'
          )}
        </button>
      </div>
    </div>
  );
}
