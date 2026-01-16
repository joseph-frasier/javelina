'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { StripeProvider } from '@/components/stripe/StripeProvider';
import { StripePaymentForm } from '@/components/stripe/StripePaymentForm';
import { useToastStore } from '@/lib/toast-store';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { discountsApi } from '@/lib/api-client';
import Button from '@/components/ui/Button';

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

interface AppliedDiscount {
  code: string;
  promotion_code_id: string;
  stripe_promotion_code_id: string;
  discount_type: 'percent_off' | 'amount_off';
  discount_value: number;
  discounted_amount: number;
  final_price: number;
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
  
  // Checkout state
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'review' | 'payment'>('review');
  
  // Payment state
  const [clientSecret, setClientSecret] = useState<string>('');
  const [flow, setFlow] = useState<'payment_intent' | 'setup_intent'>('payment_intent');
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);
  
  // Discount code state
  const [discountCode, setDiscountCode] = useState('');
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Parse checkout data from URL on mount
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
    
    // For upgrades, skip review step and go directly to payment
    if (upgrade_type) {
      handleProceedToPayment(data, null);
    }
  }, [searchParams, router, addToast]);

  // Handle discount code validation
  const handleApplyDiscount = async () => {
    if (!discountCode.trim() || !checkoutData) return;
    
    setIsValidatingDiscount(true);
    setDiscountError(null);
    
    try {
      const result = await discountsApi.validate(discountCode.trim(), checkoutData.plan_code);
      
      if (result.valid && result.discount_type && result.discount_value !== undefined) {
        const originalPrice = checkoutData.plan_price || 0;
        let discountedAmount = 0;
        let finalPrice = originalPrice;
        
        if (result.discount_type === 'percent_off') {
          discountedAmount = (originalPrice * result.discount_value) / 100;
          finalPrice = originalPrice - discountedAmount;
        } else {
          // amount_off is in cents, convert to dollars
          discountedAmount = result.discount_value / 100;
          finalPrice = Math.max(0, originalPrice - discountedAmount);
        }
        
        setAppliedDiscount({
          code: discountCode.trim().toUpperCase(),
          promotion_code_id: result.promotion_code_id || '',
          stripe_promotion_code_id: result.stripe_promotion_code_id || '',
          discount_type: result.discount_type,
          discount_value: result.discount_value,
          discounted_amount: discountedAmount,
          final_price: finalPrice,
        });
        
        addToast('success', 'Discount code applied!');
      } else {
        setDiscountError(result.message || 'Invalid discount code');
      }
    } catch (error: any) {
      setDiscountError(error.message || 'Failed to validate discount code');
    } finally {
      setIsValidatingDiscount(false);
    }
  };
  
  // Remove applied discount
  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
    setDiscountError(null);
  };

  // Proceed to payment - create subscription with optional discount
  const handleProceedToPayment = async (data?: CheckoutData, discount?: AppliedDiscount | null) => {
    const checkout = data || checkoutData;
    const appliedPromo = discount !== undefined ? discount : appliedDiscount;
    
    if (!checkout) return;
    
    setIsCreatingSubscription(true);
    
    try {
      const { stripeApi } = await import('@/lib/api-client');
      
      const { org_id, plan_code, price_id, upgrade_type } = checkout;
      
      // Use upgrade endpoint for lifetime upgrades, regular for new subscriptions
      let response;
      if (upgrade_type === 'subscription-to-lifetime' || upgrade_type === 'lifetime-to-lifetime') {
        // Call the upgrade endpoint which returns a PaymentIntent
        response = await stripeApi.upgradeToLifetime(org_id, plan_code);
      } else {
        // Regular subscription creation - include promotion code if applied
        response = await stripeApi.createSubscription(
          org_id, 
          plan_code, 
          price_id || undefined,
          appliedPromo?.stripe_promotion_code_id
        );
      }

      setClientSecret(response.clientSecret);
      setFlow(response.flow || 'payment_intent');
      setCheckoutStep('payment');
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      addToast('error', error.message || 'Failed to create subscription');
    } finally {
      setIsCreatingSubscription(false);
    }
  };

  const handlePaymentSuccess = () => {
    addToast('success', 'Payment successful! Activating your subscription...');
    // User will be redirected by Stripe to the return_url
  };

  const handlePaymentError = (error: string) => {
    addToast('error', error);
  };

  if (!checkoutData) {
    return (
      <div className="min-h-screen bg-orange-light flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange"></div>
      </div>
    );
  }

  const isUpgrade = !!checkoutData.upgrade_type;
  const isLifetime = checkoutData.billing_interval === 'lifetime';
  const finalPrice = appliedDiscount && !isUpgrade 
    ? appliedDiscount.final_price 
    : checkoutData.plan_price || 0;

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

        {/* Loading State for Upgrades */}
        {isUpgrade && isCreatingSubscription && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
              <span className="text-orange-dark dark:text-white">Loading payment form...</span>
            </div>
          </div>
        )}

        {/* Review Step - Show order summary and discount input */}
        {checkoutStep === 'review' && !isUpgrade && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-light shadow-lg p-8">
              <h2 className="text-xl font-bold text-orange-dark mb-6">
                Order Summary
              </h2>

              <div className="space-y-6">
                {/* Plan Details */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-orange-dark">
                      {checkoutData.plan_name}
                    </h3>
                    {isLifetime && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase">
                        Lifetime
                      </span>
                    )}
                    {!isLifetime && (
                      <p className="text-sm text-gray-slate font-light mt-1">
                        Billed {checkoutData.billing_interval}ly
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-dark">
                      ${Number(checkoutData.plan_price).toFixed(2)}
                    </p>
                    {!isLifetime && (
                      <p className="text-sm text-gray-slate font-light">
                        /{checkoutData.billing_interval}
                      </p>
                    )}
                  </div>
                </div>

                {/* Discount Code Input - Hidden for lifetime plans */}
                {!isLifetime && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-orange-dark mb-2">
                        Have a discount code?
                      </label>
                      {appliedDiscount ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-medium text-green-700">{appliedDiscount.code}</span>
                            <span className="text-sm text-green-600">
                              {appliedDiscount.discount_type === 'percent_off' 
                                ? `${appliedDiscount.discount_value}% off`
                                : `-$${(appliedDiscount.discount_value / 100).toFixed(2)}`
                              }
                            </span>
                          </div>
                          <button
                            onClick={handleRemoveDiscount}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Remove discount"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={discountCode}
                            onChange={(e) => {
                              setDiscountCode(e.target.value.toUpperCase());
                              setDiscountError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyDiscount();
                              }
                            }}
                            placeholder="Enter code"
                            className="flex-1 px-3 py-2 border border-gray-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                            disabled={isValidatingDiscount}
                          />
                          <button
                            onClick={handleApplyDiscount}
                            disabled={!discountCode.trim() || isValidatingDiscount}
                            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isValidatingDiscount ? (
                              <div className="flex items-center space-x-1">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                              </div>
                            ) : (
                              'Apply'
                            )}
                          </button>
                        </div>
                      )}
                      {discountError && (
                        <p className="mt-2 text-sm text-red-600">{discountError}</p>
                      )}
                    </div>

                    {/* Discount Breakdown */}
                    {appliedDiscount && (
                      <div className="space-y-2 py-3 border-t border-gray-light">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-slate">Subtotal</span>
                          <span className="text-gray-700">${Number(checkoutData.plan_price).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">Discount ({appliedDiscount.code})</span>
                          <span className="text-green-600">-${appliedDiscount.discounted_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-4">
                  <span className="text-lg font-bold text-orange-dark">
                    Total due today
                  </span>
                  <span className="text-2xl font-black text-orange-dark">
                    ${finalPrice.toFixed(2)}
                  </span>
                </div>

                {/* Proceed Button */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => handleProceedToPayment()}
                  disabled={isCreatingSubscription}
                >
                  {isCreatingSubscription ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Setting up payment...
                    </div>
                  ) : (
                    'Continue to Payment'
                  )}
                </Button>

                {/* Fine Print */}
                <div className="pt-4 -mx-8 px-8 border-t border-gray-light">
                  {isLifetime ? (
                    <p className="text-xs text-gray-slate font-light text-center">
                      This is a one-time payment for lifetime access. 
                      No recurring charges will be made.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-slate font-light text-center">
                      Your subscription will automatically renew every{' '}
                      {checkoutData.billing_interval}. You can cancel anytime from your
                      account settings.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Step - Show Stripe form */}
        {checkoutStep === 'payment' && clientSecret && (
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

                  {/* Discount Applied Badge - Hidden for lifetime plans */}
                  {appliedDiscount && !isUpgrade && !isLifetime && (
                    <div className="space-y-2 py-3 border-t border-gray-light dark:border-gray-700">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-slate dark:text-gray-400">Subtotal</span>
                        <span className="text-gray-700 dark:text-gray-300">${Number(checkoutData.plan_price).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Discount ({appliedDiscount.code})</span>
                        <span className="text-green-600">-${appliedDiscount.discounted_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Non-upgrade/non-discount divider */}
                  {!isUpgrade && !appliedDiscount && (
                    <div className="border-t border-gray-light dark:border-gray-700"></div>
                  )}

                  {/* Total */}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-bold text-orange-dark dark:text-white">
                      {isUpgrade ? 'Upgrade Cost' : 'Total due today'}
                    </span>
                    <span className="text-2xl font-black text-orange-dark dark:text-orange">
                      ${finalPrice.toFixed(2)}
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
