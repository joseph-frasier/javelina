'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

interface IncompletePaymentBannerProps {
  orgId: string;
  orgName: string;
  pendingPlanCode?: string | null;
  pendingPriceId?: string | null;
  pendingPlanName?: string | null;
  pendingPlanPrice?: number | null;
  pendingBillingInterval?: string | null;
  className?: string;
}

export function IncompletePaymentBanner({
  orgId,
  orgName,
  pendingPlanCode,
  pendingPriceId,
  pendingPlanName,
  pendingPlanPrice,
  pendingBillingInterval,
  className = '',
}: IncompletePaymentBannerProps) {
  const router = useRouter();

  const handleResumeCheckout = () => {
    if (pendingPlanCode && pendingPriceId) {
      const isLifetime = pendingPlanCode.includes('_lifetime');
      const billingInterval = pendingBillingInterval
        || (isLifetime ? 'lifetime' : 'month');
      const planName = pendingPlanName || pendingPlanCode;
      const planPrice = pendingPlanPrice ?? 0;

      const params = new URLSearchParams({
        org_id: orgId,
        plan_code: pendingPlanCode,
        price_id: pendingPriceId,
        plan_name: planName,
        plan_price: String(planPrice),
        billing_interval: billingInterval,
      });

      router.push(`/checkout?${params.toString()}`);
    } else {
      router.push('/pricing');
    }
  };

  return (
    <div className={`bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
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
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Payment Incomplete
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Your organization <strong>&ldquo;{orgName}&rdquo;</strong> was created but payment was not completed.
              All features are locked until you purchase a subscription.
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 sm:ml-4">
          <Button
            variant="primary"
            size="sm"
            onClick={handleResumeCheckout}
            className="w-full sm:w-auto whitespace-nowrap"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Complete Payment
          </Button>
        </div>
      </div>
    </div>
  );
}
