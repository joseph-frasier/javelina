'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { StripeProvider } from '@/components/stripe/StripeProvider';
import { StripePaymentForm } from '@/components/stripe/StripePaymentForm';
import { useToastStore } from '@/lib/toast-store';

interface CheckoutData {
  org_id: string;
  plan_code: string;
  price_id: string;
  plan_name?: string;
  plan_price?: number;
  billing_interval?: string;
}

interface SubscriptionIntent {
  subscriptionId: string;
  clientSecret: string;
  flow: 'payment_intent' | 'setup_intent';
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addToast = useToastStore((state) => state.addToast);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [flow, setFlow] = useState<'payment_intent' | 'setup_intent'>('payment_intent');
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const hasRequestedRef = useState({ current: false })[0];

  useEffect(() => {
    const org_id = searchParams.get('org_id');
    const plan_code = searchParams.get('plan_code');
    const price_id = searchParams.get('price_id');

    if (!org_id || !plan_code) {
      addToast('error', 'Invalid checkout parameters');
      router.push('/pricing');
      return;
    }

    setCheckoutData({
      org_id,
      plan_code,
      price_id: price_id || '',
      plan_name: searchParams.get('plan_name') || 'Selected Plan',
      plan_price: parseFloat(searchParams.get('plan_price') || '0'),
      billing_interval: searchParams.get('billing_interval') || 'lifetime',
    });

    // Guard against double invocation in React StrictMode
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    // Create subscription intent
    const createSubscriptionIntent = async () => {
      try {
        setIsLoading(true);

        const { stripeApi } = await import('@/lib/api-client');
        const data = await stripeApi.createSubscription(org_id, plan_code, price_id || undefined);

        setClientSecret(data.clientSecret);
        setFlow(data.flow);
      } catch (error: any) {
        console.error('Error creating subscription:', error);
        addToast('error', error.message || 'Failed to initialize payment');
        router.push('/pricing');
      } finally {
        setIsLoading(false);
      }
    };

    createSubscriptionIntent();
  }, [searchParams, router, addToast, hasRequestedRef]);

  const handlePaymentSuccess = () => {
    addToast('success', 'Payment successful! Activating your subscription...');
    // User will be redirected by Stripe to the return_url
  };

  const handlePaymentError = (error: string) => {
    addToast('error', error);
  };

  if (!checkoutData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-orange-light">
      {/* Header */}
      <div className="border-b border-gray-light bg-white">
        <div className="max-w-7xl mx-auto pl-2 pr-4 sm:pl-3 sm:pr-6 lg:pl-4 lg:pr-8 py-1 flex items-center justify-between">
          <Logo width={150} height={60} />
          <Link
            href="/pricing"
            className="inline-flex items-center text-orange hover:underline font-regular"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to pricing
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-orange-dark mb-2">
            Complete Your Purchase
          </h1>
          <p className="text-base text-gray-slate font-light">
            You&apos;re one step away from unlocking powerful DNS management
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
              <span className="text-orange-dark">Loading payment form...</span>
            </div>
          </div>
        )}

        {/* Payment Form */}
        {!isLoading && clientSecret && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Payment Form - 2 columns */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-light shadow-lg p-8">
                <h2 className="text-2xl font-bold text-orange-dark mb-6">
                  Payment Details
                </h2>
                <StripeProvider clientSecret={clientSecret}>
                  <StripePaymentForm
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    orgId={checkoutData.org_id}
                    flow={flow}
                  />
                </StripeProvider>
              </div>
            </div>

            {/* Order Summary - 1 column */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-light shadow-lg p-8 sticky top-8">
                <h2 className="text-xl font-bold text-orange-dark mb-6">
                  Order Summary
                </h2>

                <div className="space-y-6">
                  {/* Plan Details */}
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-orange-dark">
                          {checkoutData.plan_name}
                        </h3>
                        <p className="text-sm text-gray-slate font-light">
                          Billed {checkoutData.billing_interval}ly
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-dark">
                          ${Number(checkoutData.plan_price).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-slate font-light">
                          /{checkoutData.billing_interval}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-light"></div>

                  {/* Total */}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-bold text-orange-dark">
                      Total due today
                    </span>
                    <span className="text-2xl font-black text-orange-dark">
                      ${Number(checkoutData.plan_price).toFixed(2)}
                    </span>
                  </div>

                  {/* Fine Print */}
                  <div className="pt-4 border-t border-gray-light">
                    <p className="text-xs text-gray-slate font-light">
                      Your subscription will automatically renew every{' '}
                      {checkoutData.billing_interval}. You can cancel anytime from your
                      account settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-orange-light flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
