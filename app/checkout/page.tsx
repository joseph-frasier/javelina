'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { StripeProvider } from '@/components/stripe/StripeProvider';
import { StripePaymentForm } from '@/components/stripe/StripePaymentForm';
import { useToastStore } from '@/lib/stores/toast-store';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import {
  discountsApi,
  pricingApi,
  ApiError,
  type CodeEvaluation,
  type PricingRule,
  type RejectionReason,
  type PricingDiscountType,
  type PricingCategory,
} from '@/lib/api-client';
import { summarizeRules, summarizeDuration } from '@/lib/discounts/format';
import { activeRules } from '@/lib/pricing/format';
import Button from '@/components/ui/Button';
import { LegalFooterLinks } from '@/components/legal/LegalFooterLinks';

/** A code's rules can include a plan/all-scoped grant (changes this invoice's
 * total) alongside domain/mailbox grants (nothing on this invoice for them to
 * discount, so they render as included-benefit copy instead). */
function isPlanOrAllRule(rule: { scope: 'all' | 'category'; category: PricingCategory | null }): boolean {
  return rule.scope === 'all' || (rule.scope === 'category' && rule.category === 'plan');
}

/** Apply a single rule to a cents amount. Cents in, cents out — never floats. */
function priceAfterRule(
  rule: { discount_type: PricingDiscountType; value_bps: number | null; value_cents: number | null },
  originalCents: number
): number {
  switch (rule.discount_type) {
    case 'percent':
      // Same formula as the backend's amountFor (services/pricing/apply.ts) —
      // subtracting a rounded discount instead diverges by a cent on an exact
      // half-cent, so the preview would not match the invoice.
      return Math.max(0, Math.round((originalCents * (10000 - (rule.value_bps ?? 0))) / 10000));
    case 'waive':
      return 0;
    case 'price_override':
      return Math.max(0, rule.value_cents ?? 0);
  }
}

type DiscountRuleForMath = Pick<PricingRule, 'scope' | 'category' | 'discount_type' | 'value_bps' | 'value_cents'>;

type DiscountState =
  | { kind: 'none' }
  | { kind: 'preview'; evaluation: Extract<CodeEvaluation, { status: 'valid' }> }
  | { kind: 'applied'; summary: string; duration: string }
  | { kind: 'error'; message: string };

interface CheckoutData {
  org_id: string;
  plan_code: string;
  price_id: string;
  plan_name?: string;
  plan_price?: number;
  billing_interval?: string;
  intake?: 'business' | null;
  org_name?: string;
  // Upgrade-specific fields
  upgrade_type?: 'subscription-to-lifetime' | 'lifetime-to-lifetime' | null;
  original_price?: number;
  credit_amount?: number;
  from_plan_code?: string;
}

interface InvoiceSummary {
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  currency: string | null;
}

interface SubscriptionIntent {
  subscriptionId: string;
  clientSecret: string;
  flow: 'payment_intent' | 'setup_intent';
  invoice?: InvoiceSummary | null;
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
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null);
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);
  
  // Discount code state
  const [discountCode, setDiscountCode] = useState('');
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [discountState, setDiscountState] = useState<DiscountState>({ kind: 'none' });
  // Raw rule data backing whichever grant discountState describes, kept separately
  // so the total can be computed in cents without smuggling numbers into the
  // display-only DiscountState.
  const [discountRules, setDiscountRules] = useState<DiscountRuleForMath[] | null>(null);
  // Tracks the latest discountState.kind for the mount-fetch effect below, so
  // that effect (which only runs once) can check "is a preview/applied grant
  // already in flight" without a stale closure and without depending on
  // discountState — which would refetch on every discount interaction.
  const discountKindRef = useRef<DiscountState['kind']>('none');
  useEffect(() => {
    discountKindRef.current = discountState.kind;
  }, [discountState.kind]);

  // Parse checkout data from URL on mount
  useEffect(() => {
    const org_id = searchParams.get('org_id');
    const plan_code = searchParams.get('plan_code');
    const price_id = searchParams.get('price_id');
    const upgrade_type = searchParams.get('upgrade_type') as CheckoutData['upgrade_type'];
    const intake = searchParams.get('intake') as 'business' | null;
    const org_name = searchParams.get('org_name') || undefined;

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
      intake,
      org_name,
      // Upgrade-specific parameters
      upgrade_type: upgrade_type || null,
      original_price: parseFloat(searchParams.get('original_price') || '0'),
      credit_amount: parseFloat(searchParams.get('credit_amount') || '0'),
      from_plan_code: searchParams.get('from_plan_code') || '',
    };

    setCheckoutData(data);

    // A customer returning mid-payment shouldn't see an empty discount box —
    // if the org already has an active grant, render it as satisfied on load.
    if (data.billing_interval !== 'lifetime') {
      pricingApi
        .list(data.org_id)
        .then(({ active }) => {
          const rules = activeRules(active);
          if (rules.length === 0) return;
          // Don't clobber a preview/applied grant the customer set up while
          // this fetch was in flight.
          if (discountKindRef.current !== 'none') return;
          const planRule = rules.find(isPlanOrAllRule);
          const durationSource = planRule ?? rules[0];
          setDiscountRules(rules);
          setDiscountState({
            kind: 'applied',
            summary: summarizeRules(rules),
            duration: summarizeDuration({ duration_months: null, grant_ends_at: durationSource.effective_until }),
          });
        })
        .catch(() => {
          // Non-fatal: discount box just stays empty if this fails.
        });
    }

    // For upgrades, skip review step and go directly to payment
    if (upgrade_type) {
      handleProceedToPayment(data);
    }
  }, [searchParams, router, addToast]);

  // Handle discount code validation
  const handleApplyDiscount = async () => {
    if (!discountCode.trim() || !checkoutData) return;

    setIsValidatingDiscount(true);

    try {
      const evaluation = await discountsApi.validate(
        discountCode.trim(),
        checkoutData.org_id,
        checkoutData.plan_code
      );

      if (evaluation.status === 'valid') {
        setDiscountRules(evaluation.rules);
        setDiscountState({ kind: 'preview', evaluation });
        addToast('success', 'Discount code applied!');
      } else if (evaluation.status === 'already_applied') {
        setDiscountRules(evaluation.rules);
        setDiscountState({
          kind: 'applied',
          summary: 'Already applied to this organization.',
          duration: summarizeDuration(evaluation.code),
        });
      } else {
        setDiscountRules(null);
        setDiscountState({ kind: 'error', message: evaluation.message });
      }
    } catch (error) {
      setDiscountRules(null);
      setDiscountState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to validate discount code',
      });
    } finally {
      setIsValidatingDiscount(false);
    }
  };

  // Remove a not-yet-redeemed preview
  const handleRemoveDiscount = () => {
    setDiscountState({ kind: 'none' });
    setDiscountRules(null);
    setDiscountCode('');
  };

  // Proceed to payment - redeem any previewed discount, then create the subscription
  const handleProceedToPayment = async (data?: CheckoutData) => {
    const checkout = data || checkoutData;

    if (!checkout) return;

    setIsCreatingSubscription(true);

    try {
      const { stripeApi } = await import('@/lib/api-client');

      const { org_id, plan_code, price_id, upgrade_type } = checkout;

      // The rules must exist on the org before the subscription is created,
      // or Stripe bills the first invoice at full price. Do not roll back on
      // a later payment failure — the grant clock starts at redemption, an
      // unpaid org has no subscription to discount, and the resume-checkout
      // flow (Step 4) lets the customer finish.
      if (discountState.kind === 'preview') {
        try {
          const { rules } = await discountsApi.redeem(discountCode.trim(), org_id);
          setDiscountRules(rules);
          setDiscountState({
            kind: 'applied',
            // summarizeRules([]) renders "No discount" — wrong inside a
            // success-styled box. Same guard as the billing-settings card.
            summary:
              rules.length > 0 ? summarizeRules(rules) : 'Applied to this organization.',
            duration: summarizeDuration(discountState.evaluation.code),
          });
        } catch (redeemError) {
          const details = (redeemError as ApiError).details as
            | { reason?: RejectionReason; message?: string }
            | undefined;
          const message =
            details?.message ||
            (redeemError instanceof Error ? redeemError.message : 'Failed to apply discount code');
          // Clear the preview's rules too — otherwise the review step keeps
          // showing a discounted total for a code that was never redeemed,
          // and a retry would create the subscription at full price while
          // the UI still displays the (unredeemed) discount.
          setDiscountRules(null);
          setDiscountState({ kind: 'error', message });
          return;
        }
      }

      // Use upgrade endpoint for lifetime upgrades, regular for new subscriptions
      let response;
      if (upgrade_type === 'subscription-to-lifetime' || upgrade_type === 'lifetime-to-lifetime') {
        // Call the upgrade endpoint which returns a PaymentIntent
        response = await stripeApi.upgradeToLifetime(org_id, plan_code);
      } else {
        response = await stripeApi.createSubscription(org_id, plan_code, price_id || undefined);
      }

      setClientSecret(response.clientSecret);
      setFlow(response.flow || 'payment_intent');
      setInvoice(response.invoice ?? null);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
      </div>
    );
  }

  const isUpgrade = !!checkoutData.upgrade_type;
  const isLifetime = checkoutData.billing_interval === 'lifetime';

  // Only a plan-scoped or all-scoped rule changes this checkout's total;
  // domain/mailbox grants render as included-benefit copy instead, since this
  // invoice has nothing for them to discount.
  const originalCents = Math.round((checkoutData.plan_price || 0) * 100);
  const planDiscountRule = discountRules?.find(isPlanOrAllRule) ?? null;
  const includedBenefitRules = discountRules?.filter((rule) => !isPlanOrAllRule(rule)) ?? [];
  const discountedCents = planDiscountRule ? priceAfterRule(planDiscountRule, originalCents) : originalCents;
  const discountAmountCents = originalCents - discountedCents;
  const finalPrice = !isUpgrade && discountRules ? discountedCents / 100 : checkoutData.plan_price || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface">
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
          <h1 className="text-3xl font-black text-text mb-2">
            {isUpgrade ? 'Complete Your Upgrade' : 'Complete Your Purchase'}
          </h1>
          <p className="text-base text-text-muted font-light">
            {isUpgrade 
              ? 'You\'re upgrading to a lifetime plan with enhanced features'
              : 'You\'re one step away from unlocking powerful DNS management'}
          </p>
        </div>

        {/* Loading State for Upgrades */}
        {isUpgrade && isCreatingSubscription && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              <span className="text-text">Loading payment form...</span>
            </div>
          </div>
        )}

        {/* Review Step - Show order summary and discount input */}
        {checkoutStep === 'review' && !isUpgrade && (
          <div className="max-w-xl mx-auto">
            <div className="bg-surface rounded-xl border border-border shadow-lg p-8">
              <h2 className="text-xl font-bold text-text mb-6">
                Order Summary
              </h2>

              <div className="space-y-6">
                {/* Plan Details */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-text">
                      {checkoutData.plan_name}
                    </h3>
                    {isLifetime && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase">
                        Lifetime
                      </span>
                    )}
                    {!isLifetime && (
                      <p className="text-sm text-text-muted font-light mt-1">
                        Billed {checkoutData.billing_interval}ly
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-text">
                      ${Number(checkoutData.plan_price).toFixed(2)}
                    </p>
                    {!isLifetime && (
                      <p className="text-sm text-text-muted font-light">
                        /{checkoutData.billing_interval}
                      </p>
                    )}
                  </div>
                </div>

                {/* Discount Code Input - Hidden for lifetime plans */}
                {!isLifetime && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">
                        Have a discount code?
                      </label>
                      {discountState.kind === 'preview' || discountState.kind === 'applied' ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <div>
                              <p className="font-medium text-green-700 text-sm">
                                {discountState.kind === 'preview'
                                  ? summarizeRules(discountState.evaluation.rules)
                                  : discountState.summary}
                              </p>
                              <p className="text-xs text-green-600">
                                {discountState.kind === 'preview'
                                  ? summarizeDuration(discountState.evaluation.code)
                                  : discountState.duration}
                              </p>
                            </div>
                          </div>
                          {discountState.kind === 'preview' && (
                            <button
                              onClick={handleRemoveDiscount}
                              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                              aria-label="Remove discount"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={discountCode}
                            onChange={(e) => {
                              setDiscountCode(e.target.value.toUpperCase());
                              if (discountState.kind === 'error') setDiscountState({ kind: 'none' });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyDiscount();
                              }
                            }}
                            placeholder="Enter code"
                            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
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
                      {discountState.kind === 'error' && (
                        <p className="mt-2 text-sm text-red-600">{discountState.message}</p>
                      )}
                    </div>

                    {/* Discount Breakdown - only a plan/all-scoped rule changes this total */}
                    {planDiscountRule && (
                      <div className="space-y-2 py-3 border-t border-border">
                        <div className="flex justify-between text-sm">
                          <span className="text-text-muted">Subtotal</span>
                          <span className="text-gray-700">${Number(checkoutData.plan_price).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">Discount</span>
                          <span className="text-green-600">-${(discountAmountCents / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* Domain/mailbox grants have nothing on this invoice to discount */}
                    {includedBenefitRules.length > 0 && (
                      <p className="text-xs text-text-muted font-light">
                        Also includes: {summarizeRules(includedBenefitRules)}
                      </p>
                    )}
                  </>
                )}

                {/* Tax breakdown (shown after subscription intent is created) */}
                {invoice?.tax != null && invoice.tax > 0 ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>${((invoice.subtotal ?? 0) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Sales tax</span>
                      <span>${((invoice.tax ?? 0) / 100).toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-text-muted font-light">
                    Sales tax calculated at checkout.
                  </p>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-4">
                  <span className="text-lg font-bold text-text">
                    Total due today
                  </span>
                  <span className="text-2xl font-black text-text">
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
                <div className="pt-4 -mx-8 px-8 border-t border-border">
                  {isLifetime ? (
                    <p className="text-xs text-text-muted font-light text-center">
                      This is a one-time payment for lifetime access. 
                      No recurring charges will be made.
                    </p>
                  ) : (
                    <p className="text-xs text-text-muted font-light text-center">
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
              <div className="bg-surface rounded-xl border border-border shadow-lg p-8">
                <h2 className="text-2xl font-bold text-text mb-6">
                  Payment Details
                </h2>
                <StripeProvider clientSecret={clientSecret}>
                  <StripePaymentForm
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    orgId={checkoutData.org_id}
                    flow={flow}
                    intake={checkoutData.intake}
                    planCode={checkoutData.plan_code}
                    orgName={checkoutData.org_name}
                  />
                </StripeProvider>
              </div>
            </div>

            {/* Order Summary - 1 column */}
            <div className="lg:col-span-1">
              <div className="bg-surface rounded-xl border border-border shadow-lg p-8 sticky top-8">
                <h2 className="text-xl font-bold text-text mb-6">
                  {isUpgrade ? 'Upgrade Summary' : 'Order Summary'}
                </h2>

                <div className="space-y-6">
                  {/* Plan Details */}
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-text">
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
                          <p className="font-bold text-text">
                            ${Number(checkoutData.plan_price).toFixed(2)}
                          </p>
                          {!isLifetime && (
                            <p className="text-sm text-text-muted font-light">
                              /{checkoutData.billing_interval}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upgrade Pricing Breakdown */}
                  {isUpgrade && checkoutData.original_price !== undefined && (
                    <div className="space-y-3 py-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">
                          {checkoutData.plan_name} Price
                        </span>
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          ${Number(checkoutData.original_price).toFixed(2)}
                        </span>
                      </div>
                      
                      {checkoutData.credit_amount !== undefined && checkoutData.credit_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-text-muted">
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
                  {planDiscountRule && !isUpgrade && !isLifetime && (
                    <div className="space-y-2 py-3 border-t border-border">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">Subtotal</span>
                        <span className="text-gray-700 dark:text-gray-300">${Number(checkoutData.plan_price).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Discount</span>
                        <span className="text-green-600">-${(discountAmountCents / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Domain/mailbox grants have nothing on this invoice to discount,
                      but shouldn't vanish once the customer advances past review. */}
                  {includedBenefitRules.length > 0 && !isUpgrade && !isLifetime && (
                    <p className="text-xs text-text-muted font-light">
                      Also includes: {summarizeRules(includedBenefitRules)}
                    </p>
                  )}

                  {/* Tax breakdown */}
                  {invoice?.tax != null && invoice.tax > 0 ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>${((invoice.subtotal ?? 0) / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Sales tax</span>
                        <span>${((invoice.tax ?? 0) / 100).toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-text-muted font-light">
                      Sales tax calculated at checkout.
                    </p>
                  )}

                  {/* Total */}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-bold text-text">
                      {isUpgrade ? 'Upgrade Cost' : 'Total due today'}
                    </span>
                    <span className="text-2xl font-black text-text">
                      ${invoice?.total != null ? (invoice.total / 100).toFixed(2) : finalPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Fine Print */}
                  <div className="pt-4">
                    {isLifetime ? (
                      <p className="text-xs text-text-muted font-light">
                        This is a one-time payment for lifetime access. 
                        No recurring charges will be made.
                        {isUpgrade && checkoutData.upgrade_type === 'subscription-to-lifetime' && (
                          <span className="block mt-2">
                            Your monthly subscription will be automatically canceled after this purchase.
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-text-muted font-light">
                        Your subscription will automatically renew every{' '}
                        {checkoutData.billing_interval}. You can cancel anytime from your
                        account settings.
                      </p>
                    )}
                  </div>

                  {/* Upgrade Benefits */}
                  {isUpgrade && (
                    <div className="pt-4">
                      <h4 className="text-sm font-bold text-text mb-3">
                        What you get:
                      </h4>
                      <ul className="space-y-2">
                        <li className="flex items-start text-xs">
                          <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-text-muted">Lifetime access - no recurring fees</span>
                        </li>
                        <li className="flex items-start text-xs">
                          <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-text-muted">All future updates included</span>
                        </li>
                        <li className="flex items-start text-xs">
                          <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-text-muted">Priority support</span>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mt-10 border-t border-border pt-6">
          <LegalFooterLinks />
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
