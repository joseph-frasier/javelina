'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { StripeProvider } from '@/components/stripe/StripeProvider';
import { StripePaymentForm } from '@/components/stripe/StripePaymentForm';
import { useToastStore } from '@/lib/toast-store';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

interface CheckoutData {
  org_id: string;
  plan_code: string;
  price_id: string;
  plan_name?: string;
  plan_price?: number;
  billing_interval?: string;
  // Upgrade-specific fields
  upgrade_type?: 'subscription-to-lifetime' | 'lifetime-to-lifetime' | null;
  original_price?: number;
  credit_amount?: number;
  from_plan_code?: string;
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
    const upgrade_type = searchParams.get('upgrade_type') as CheckoutData['upgrade_type'];

    if (!org_id || !plan_code) {
      addToast('error', 'Invalid checkout parameters');
      router.push('/pricing');
      return;
    }

    const data: CheckoutData = {
      org_id,
      plan_code,
      price_id: price_id || '',
      plan_name: searchParams.get('plan_name') || 'Selected Plan',
      plan_price: parseFloat(searchParams.get('plan_price') || '0'),
      billing_interval: searchParams.get('billing_interval') || 'lifetime',
      // Upgrade-specific parameters
      upgrade_type: upgrade_type || null,
      original_price: parseFloat(searchParams.get('original_price') || '0'),
      credit_amount: parseFloat(searchParams.get('credit_amount') || '0'),
      from_plan_code: searchParams.get('from_plan_code') || '',
    };

    setCheckoutData(data);

    // Guard against double invocation in React StrictMode
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    // Create subscription/payment intent
    const createPaymentIntent = async () => {
      try {
        setIsLoading(true);

        const { stripeApi } = await import('@/lib/api-client');
        
        // Use upgrade endpoint for lifetime upgrades, regular for new subscriptions
        let response;
        if (upgrade_type === 'subscription-to-lifetime' || upgrade_type === 'lifetime-to-lifetime') {
          // Call the upgrade endpoint which returns a PaymentIntent
          response = await stripeApi.upgradeToLifetime(org_id, plan_code);
        } else {
          // Regular subscription creation
          response = await stripeApi.createSubscription(org_id, plan_code, price_id || undefined);
        }

        setClientSecret(response.clientSecret);
        setFlow(response.flow || 'payment_intent');
      } catch (error: any) {
        console.error('Error creating payment intent:', error);
        addToast('error', error.message || 'Failed to initialize payment');
        router.push('/pricing');
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
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

  const isUpgrade = !!checkoutData.upgrade_type;
  const isLifetime = checkoutData.billing_interval === 'lifetime';

  return (
    <div className="min-h-screen bg-orange-light dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-light dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto pl-2 pr-4 sm:pl-3 sm:pr-6 lg:pl-4 lg:pr-8 py-1 flex items-center justify-between">
          <Logo width={150} height={60} />
          <Breadcrumb 
            items={[
              { label: 'Dashboard', href: '/' },
              { label: isUpgrade ? 'Billing' : 'Select Plan', href: isUpgrade ? '/settings/billing' : '/pricing' },
              { label: isUpgrade ? 'Upgrade' : 'Checkout' }
            ]}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-orange-dark dark:text-white mb-2">
            {isUpgrade ? 'Complete Your Upgrade' : 'Complete Your Purchase'}
          </h1>
          <p className="text-base text-gray-slate dark:text-gray-400 font-light">
            {isUpgrade 
              ? 'You\'re upgrading to a lifetime plan with enhanced features'
              : 'You\'re one step away from unlocking powerful DNS management'}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
              <span className="text-orange-dark dark:text-white">Loading payment form...</span>
            </div>
          </div>
        )}

        {/* Payment Form */}
        {!isLoading && clientSecret && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Payment Form - 2 columns */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-light dark:border-gray-700 shadow-lg p-8">
                <h2 className="text-2xl font-bold text-orange-dark dark:text-white mb-6">
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
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-light dark:border-gray-700 shadow-lg p-8 sticky top-8">
                <h2 className="text-xl font-bold text-orange-dark dark:text-white mb-6">
                  {isUpgrade ? 'Upgrade Summary' : 'Order Summary'}
                </h2>

                <div className="space-y-6">
                  {/* Plan Details */}
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-orange-dark dark:text-orange">
                          {checkoutData.plan_name}
                        </h3>
                        {isLifetime && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-full uppercase">
                            Lifetime
                          </span>
                        )}
                      </div>
                      {!isUpgrade && (
                        <div className="text-right">
                          <p className="font-bold text-orange-dark dark:text-orange">
                            ${Number(checkoutData.plan_price).toFixed(2)}
                          </p>
                          {!isLifetime && (
                            <p className="text-sm text-gray-slate dark:text-gray-400 font-light">
                              /{checkoutData.billing_interval}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upgrade Pricing Breakdown */}
                  {isUpgrade && checkoutData.original_price !== undefined && (
                    <div className="space-y-3 py-4 border-t border-b border-gray-light dark:border-gray-700">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-slate dark:text-gray-400">
                          {checkoutData.plan_name} Price
                        </span>
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          ${Number(checkoutData.original_price).toFixed(2)}
                        </span>
                      </div>
                      
                      {checkoutData.credit_amount !== undefined && checkoutData.credit_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-slate dark:text-gray-400">
                            {checkoutData.upgrade_type === 'lifetime-to-lifetime' 
                              ? 'Current Plan Credit'
                              : 'Subscription Credit'}
                          </span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            -${Number(checkoutData.credit_amount).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Non-upgrade divider */}
                  {!isUpgrade && (
                    <div className="border-t border-gray-light dark:border-gray-700"></div>
                  )}

                  {/* Total */}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-bold text-orange-dark dark:text-white">
                      {isUpgrade ? 'Upgrade Cost' : 'Total due today'}
                    </span>
                    <span className="text-2xl font-black text-orange-dark dark:text-orange">
                      ${Number(checkoutData.plan_price).toFixed(2)}
                    </span>
                  </div>

                  {/* Fine Print */}
                  <div className="pt-4 border-t border-gray-light dark:border-gray-700">
                    {isLifetime ? (
                      <p className="text-xs text-gray-slate dark:text-gray-400 font-light">
                        This is a one-time payment for lifetime access. 
                        No recurring charges will be made.
                        {isUpgrade && checkoutData.upgrade_type === 'subscription-to-lifetime' && (
                          <span className="block mt-2">
                            Your monthly subscription will be automatically canceled after this purchase.
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-slate dark:text-gray-400 font-light">
                        Your subscription will automatically renew every{' '}
                        {checkoutData.billing_interval}. You can cancel anytime from your
                        account settings.
                      </p>
                    )}
                  </div>

                  {/* Upgrade Benefits */}
                  {isUpgrade && (
                    <div className="pt-4 border-t border-gray-light dark:border-gray-700">
                      <h4 className="text-sm font-bold text-orange-dark dark:text-white mb-3">
                        What you get:
                      </h4>
                      <ul className="space-y-2">
                        <li className="flex items-start text-xs">
                          <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-slate dark:text-gray-400">Lifetime access - no recurring fees</span>
                        </li>
                        <li className="flex items-start text-xs">
                          <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-slate dark:text-gray-400">All future updates included</span>
                        </li>
                        <li className="flex items-start text-xs">
                          <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-slate dark:text-gray-400">Priority support</span>
                        </li>
                      </ul>
                    </div>
                  )}
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
      <div className="min-h-screen bg-orange-light dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
