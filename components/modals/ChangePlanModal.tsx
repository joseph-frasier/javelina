'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchPlans, type Plan, isValidUpgrade, getUpgradeType, calculateLifetimeUpgradePrice, isLifetimePlan } from '@/lib/plans-config';
import { useToastStore } from '@/lib/toast-store';
import { stripeApi } from '@/lib/api-client';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import Button from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanCode: string;
  orgId: string;
  onSuccess?: () => void;
}

interface UpgradePricing {
  originalPrice: number;
  credit: number;
  finalPrice: number;
  upgradeType: 'subscription-to-lifetime' | 'lifetime-to-lifetime' | 'subscription-to-subscription' | 'invalid';
}

export function ChangePlanModal({
  isOpen,
  onClose,
  currentPlanCode,
  orgId,
  onSuccess,
}: ChangePlanModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upgradePricing, setUpgradePricing] = useState<UpgradePricing | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  // Feature flags for starter-only launch
  const { hideProPlans, hideBusinessPlans } = useFeatureFlags();
  
  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const allPlans = await fetchPlans();
      
      // Show all plans except enterprise (contact sales)
      const availablePlans = allPlans.filter(plan => {
        // Filter out enterprise plans (contact sales only)
        if (plan.code === 'enterprise' || plan.code === 'enterprise_lifetime') return false;
        
        // Apply feature flags to hide Pro and Business plans
        if (hideProPlans && (plan.code === 'pro' || plan.code === 'pro_lifetime')) return false;
        if (hideBusinessPlans && (plan.code === 'business' || plan.code === 'premium_lifetime')) return false;
        
        return true;
      });
      
      setPlans(availablePlans);
    } catch (error) {
      console.error('Failed to load plans:', error);
      addToast('error', 'Failed to load available plans');
    } finally {
      setLoading(false);
    }
  }, [addToast, hideProPlans, hideBusinessPlans]);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
      setSelectedPlanCode(null); // Reset selection when opening
      setUpgradePricing(null);
    }
  }, [isOpen, loadPlans]);

  const handleSelectPlan = async (planCode: string) => {
    if (planCode === currentPlanCode) {
      addToast('info', 'You are already on this plan');
      return;
    }

    if (!isValidUpgrade(currentPlanCode, planCode)) {
      addToast('error', 'This plan change is not allowed');
      return;
    }

    setSelectedPlanCode(planCode);
    
    // Calculate upgrade pricing
    const upgradeType = getUpgradeType(currentPlanCode, planCode);
    
    if (upgradeType === 'lifetime-to-lifetime') {
      // Calculate price difference locally for lifetime to lifetime
      const currentPlan = plans.find(p => p.code === currentPlanCode);
      const targetPlan = plans.find(p => p.code === planCode);
      
      if (currentPlan && targetPlan) {
        const priceDifference = calculateLifetimeUpgradePrice(currentPlan, targetPlan);
        setUpgradePricing({
          originalPrice: targetPlan.monthly?.amount || 0,
          credit: currentPlan.monthly?.amount || 0,
          finalPrice: priceDifference,
          upgradeType,
        });
      }
    } else if (upgradeType === 'subscription-to-lifetime' || upgradeType === 'subscription-to-subscription') {
      // Calculate prorated credit from backend for both lifetime and subscription upgrades
      try {
        setCalculatingPrice(true);
        const response = await stripeApi.calculateUpgrade(orgId, planCode);
        setUpgradePricing({
          originalPrice: response.original_price || 0,
          credit: response.credit || 0,
          finalPrice: response.final_price || 0,
          upgradeType,
        });
      } catch (error: any) {
        console.error('Failed to calculate upgrade price:', error);
        addToast('error', 'Failed to calculate upgrade price');
        setSelectedPlanCode(null);
      } finally {
        setCalculatingPrice(false);
      }
    }
  };

  const handleConfirmChange = async () => {
    if (!selectedPlanCode || !upgradePricing) {
      addToast('error', 'Please select a plan');
      return;
    }

    setIsSubmitting(true);

    try {
      const upgradeType = getUpgradeType(currentPlanCode, selectedPlanCode);
      const selectedPlan = plans.find(p => p.code === selectedPlanCode);
      
      if (upgradeType === 'subscription-to-lifetime' || upgradeType === 'lifetime-to-lifetime') {
        // Redirect to checkout page with upgrade parameters
        const params = new URLSearchParams({
          org_id: orgId,
          plan_code: selectedPlanCode,
          price_id: selectedPlan?.monthly?.priceId || '',
          plan_name: selectedPlan?.name || '',
          plan_price: upgradePricing.finalPrice.toString(),
          billing_interval: 'lifetime',
          // Upgrade-specific parameters
          upgrade_type: upgradeType,
          original_price: upgradePricing.originalPrice.toString(),
          credit_amount: upgradePricing.credit.toString(),
          from_plan_code: currentPlanCode,
        });
        
        // Close modal and redirect to checkout
        onClose();
        window.location.href = `/checkout?${params.toString()}`;
      } else {
        // Use regular subscription update for monthly plan changes
        const response = await stripeApi.updateSubscription(orgId, selectedPlanCode);
        
        // Wait for webhook to process
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        // Refresh subscription data
        await onSuccess?.();
        
        // Handle proration payment status
        const { proration } = response;
        if (proration?.payment?.status === 'succeeded') {
          addToast('success', `Plan updated! Charged $${proration.amount_due.toFixed(2)} for the upgrade.`);
        } else if (proration?.payment?.status === 'failed') {
          addToast('error', `Plan updated but payment failed: ${proration.payment.error || 'Unknown error'}`);
        } else {
          addToast('success', 'Subscription plan updated successfully!');
        }
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to change plan:', error);
      addToast('error', error.message || 'Failed to update subscription plan');
      setSelectedPlanCode(null);
      setUpgradePricing(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentIsLifetime = isLifetimePlan(currentPlanCode);
  const currentPlan = plans.find((plan) => plan.code === currentPlanCode) || null;
  const selectedPlan = plans.find((plan) => plan.code === selectedPlanCode) || null;

  const reviewTitleByType: Record<UpgradePricing['upgradeType'], string> = {
    'subscription-to-lifetime': 'Lifetime upgrade review',
    'lifetime-to-lifetime': 'Lifetime plan review',
    'subscription-to-subscription': 'Subscription change review',
    invalid: 'Plan review',
  };

  const confirmLabelByType: Record<UpgradePricing['upgradeType'], string> = {
    'subscription-to-lifetime': 'Continue to Checkout',
    'lifetime-to-lifetime': 'Continue to Checkout',
    'subscription-to-subscription': 'Confirm Plan Change',
    invalid: 'Confirm Change',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentIsLifetime ? 'Upgrade Lifetime Plan' : 'Change Subscription Plan'}
      eyebrow={currentPlan ? `Current plan: ${currentPlan.name}` : 'Plan change'}
      subtitle={
        currentIsLifetime
          ? 'Review eligible higher-tier lifetime plans. Lifetime downgrades remain unavailable.'
          : 'Compare eligible monthly and lifetime options, then review pricing before you confirm.'
      }
      size="xlarge"
      bodyClassName="space-y-6"
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[22px] border border-accent bg-accent-soft p-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent">Current subscription context</p>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              {currentIsLifetime
                ? 'Select a higher-tier lifetime plan to pay the difference once. Plans below your current lifetime tier remain unavailable.'
                : 'Select any valid upgrade or subscription change. Pricing below updates after you choose a plan.'}
            </p>
          </div>

          <div className="rounded-[22px] border border-info bg-surface-alt p-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-info">How this works</p>
            <ol className="mt-3 space-y-3 text-sm text-text-muted">
              <li>1. Compare the plans that are available from your current tier.</li>
              <li>2. Select one plan to unlock the pricing review.</li>
              <li>3. Scroll down to the bottom to confirm the change or continue to checkout for lifetime upgrades.</li>
            </ol>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-[22px] border border-border bg-surface py-16 shadow-sm bg-surface-alt">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-accent"></div>
          </div>
        ) : (
          <>
              {/* Monthly plans */}
              {plans.some(p => !isLifetimePlan(p.code)) && (
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent">Monthly Plans</p>
              )}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                {plans.filter(p => !isLifetimePlan(p.code)).map((plan) => {
                  const isCurrent = plan.code === currentPlanCode;
                  const isSelected = selectedPlanCode === plan.code;
                  const isValidUpgradeOption = isValidUpgrade(currentPlanCode, plan.code);
                  const planIsLifetime = isLifetimePlan(plan.code);
                  const isDisabled = isCurrent || !isValidUpgradeOption;
                  const actionLabel = isCurrent
                    ? 'Current Plan'
                    : !isValidUpgradeOption
                    ? 'Unavailable'
                    : isSelected
                    ? 'Selected'
                    : 'Review Plan';

                  return (
                    <div
                      key={plan.id}
                      className={`relative flex flex-col rounded-[22px] border p-6 transition-all ${
                        isCurrent
                          ? 'border-accent bg-accent-soft'
                          : isSelected
                          ? 'border-accent bg-accent-soft shadow-[0_0_0_1px_rgba(239,114,21,0.12)]'
                          : isDisabled
                          ? 'border-border bg-surface-alt opacity-65 '
                          : 'border-border bg-surface hover:border-accent/40 hover:bg-accent-soft bg-surface-alt dark:hover:bg-surface/[0.06]'
                      }`}
                    >
                      <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          {isCurrent && (
                            <span className="inline-flex items-center justify-center rounded-full border border-transparent bg-accent px-3 py-1 text-[11px] font-semibold uppercase leading-none tracking-[0.18em] text-white">
                              Current
                            </span>
                          )}
                          {plan.popular && !isCurrent && (
                            <span className="inline-flex items-center justify-center rounded-full border border-accent bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase leading-none tracking-[0.18em] text-accent">
                              Popular
                            </span>
                          )}
                          {planIsLifetime && (
                            <span className="inline-flex items-center justify-center rounded-full border border-info bg-surface-alt px-3 py-1 text-[11px] font-semibold uppercase leading-none tracking-[0.18em] text-info">
                              Lifetime
                            </span>
                          )}
                        </div>
                        {!isCurrent && !isValidUpgradeOption && (
                          <span className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase leading-none tracking-[0.18em] text-text-muted ">
                            Not available
                          </span>
                        )}
                      </div>

                      <h3 className="text-2xl font-bold text-accent mb-2">{plan.name}</h3>

                      <div className="mb-4">
                        <div className="text-4xl font-black text-accent">
                          ${plan.monthly?.amount.toFixed(2)}
                        </div>
                        <div className="mt-1 text-sm uppercase tracking-[0.22em] text-text-faint">
                          {planIsLifetime ? 'One-time' : 'Per month'}
                        </div>
                      </div>

                      <p className="mb-5 text-sm leading-6 text-text-muted">
                        {plan.description}
                      </p>

                      <ul className="mb-6 flex-grow space-y-3">
                        {plan.features.slice(0, 5).map((feature, idx) => (
                          <li key={idx} className="flex items-start">
                            <svg className="w-5 h-5 text-accent mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm text-text">{feature.name}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-auto">
                        {isDisabled && !isCurrent && (
                          <p className="mb-3 text-xs leading-5 text-text-faint">
                            This plan cannot be selected from your current tier.
                          </p>
                        )}
                        <button
                          onClick={() => !isDisabled && handleSelectPlan(plan.code)}
                          disabled={isSubmitting || calculatingPrice || isDisabled}
                          className={`w-full rounded-md border-2 px-4 py-3 font-semibold transition-colors ${
                            isCurrent
                              ? 'border-accent text-accent cursor-not-allowed opacity-70'
                              : isDisabled
                              ? 'border-border text-text-muted cursor-not-allowed dark:border-white/10'
                              : isSelected
                              ? 'border-accent bg-accent text-white'
                              : 'border-accent text-accent hover:bg-accent hover:text-white'
                          }`}
                        >
                          {actionLabel}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Lifetime plans */}
              {plans.some(p => isLifetimePlan(p.code)) && (
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent">Lifetime Plans</p>
              )}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                {plans.filter(p => isLifetimePlan(p.code)).map((plan) => {
                  const isCurrent = plan.code === currentPlanCode;
                  const isSelected = selectedPlanCode === plan.code;
                  const isValidUpgradeOption = isValidUpgrade(currentPlanCode, plan.code);
                  const planIsLifetime = isLifetimePlan(plan.code);
                  const isDisabled = isCurrent || !isValidUpgradeOption;
                  const actionLabel = isCurrent
                    ? 'Current Plan'
                    : !isValidUpgradeOption
                    ? 'Unavailable'
                    : isSelected
                    ? 'Selected'
                    : 'Review Plan';

                  return (
                    <div
                      key={plan.id}
                      className={`relative flex flex-col rounded-[22px] border p-6 transition-all ${
                        isCurrent
                          ? 'border-accent bg-accent-soft'
                          : isSelected
                          ? 'border-accent bg-accent-soft shadow-[0_0_0_1px_rgba(239,114,21,0.12)]'
                          : isDisabled
                          ? 'border-border bg-surface-alt opacity-65 '
                          : 'border-border bg-surface hover:border-accent/40 hover:bg-accent-soft bg-surface-alt dark:hover:bg-surface/[0.06]'
                      }`}
                    >
                      <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          {isCurrent && (
                            <span className="inline-flex items-center justify-center rounded-full border border-transparent bg-accent px-3 py-1 text-[11px] font-semibold uppercase leading-none tracking-[0.18em] text-white">
                              Current
                            </span>
                          )}
                          {plan.popular && !isCurrent && (
                            <span className="inline-flex items-center justify-center rounded-full border border-accent bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase leading-none tracking-[0.18em] text-accent">
                              Popular
                            </span>
                          )}
                          {planIsLifetime && (
                            <span className="inline-flex items-center justify-center rounded-full border border-info bg-surface-alt px-3 py-1 text-[11px] font-semibold uppercase leading-none tracking-[0.18em] text-info">
                              Lifetime
                            </span>
                          )}
                        </div>
                        {!isCurrent && !isValidUpgradeOption && (
                          <span className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase leading-none tracking-[0.18em] text-text-muted ">
                            Not available
                          </span>
                        )}
                      </div>

                      <h3 className="text-2xl font-bold text-accent mb-2">{plan.name}</h3>

                      <div className="mb-4">
                        <div className="text-4xl font-black text-accent">
                          ${plan.monthly?.amount.toFixed(2)}
                        </div>
                        <div className="mt-1 text-sm uppercase tracking-[0.22em] text-text-faint">
                          {planIsLifetime ? 'One-time' : 'Per month'}
                        </div>
                      </div>

                      <p className="mb-5 text-sm leading-6 text-text-muted">
                        {plan.description}
                      </p>

                      <ul className="mb-6 flex-grow space-y-3">
                        {plan.features.slice(0, 5).map((feature, idx) => (
                          <li key={idx} className="flex items-start">
                            <svg className="w-5 h-5 text-accent mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm text-text">{feature.name}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-auto">
                        {isDisabled && !isCurrent && (
                          <p className="mb-3 text-xs leading-5 text-text-faint">
                            This plan cannot be selected from your current tier.
                          </p>
                        )}
                        <button
                          onClick={() => !isDisabled && handleSelectPlan(plan.code)}
                          disabled={isSubmitting || calculatingPrice || isDisabled}
                          className={`w-full rounded-md border-2 px-4 py-3 font-semibold transition-colors ${
                            isCurrent
                              ? 'border-accent text-accent cursor-not-allowed opacity-70'
                              : isDisabled
                              ? 'border-border text-text-muted cursor-not-allowed dark:border-white/10'
                              : isSelected
                              ? 'border-accent bg-accent text-white'
                              : 'border-accent text-accent hover:bg-accent hover:text-white'
                          }`}
                        >
                          {actionLabel}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedPlanCode && upgradePricing && !calculatingPrice && (
                <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-[22px] border border-border bg-surface p-6 shadow-sm bg-surface-alt">
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent">Review pricing</p>
                    <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold text-text dark:text-[#fff3ea]">
                          {reviewTitleByType[upgradePricing.upgradeType]}
                        </h3>
                        <p className="mt-1 text-sm text-text-muted">
                          {selectedPlan ? `Selected plan: ${selectedPlan.name}` : 'Selected plan'}
                        </p>
                      </div>
                      <span className="rounded-full border border-border bg-gray-50 px-3 py-1 text-xs font-medium text-text-muted  dark:text-white/65">
                        {upgradePricing.upgradeType.replaceAll('-', ' ')}
                      </span>
                    </div>

                    {upgradePricing.upgradeType === 'subscription-to-lifetime' && (
                      <div className="mt-5 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-text/55">Lifetime plan price</span>
                          <span className="font-semibold text-text">${upgradePricing.originalPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-text/55">Credit from current subscription</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">-${upgradePricing.credit.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-4 dark:border-white/10">
                          <span className="font-bold text-text">Total due today</span>
                          <span className="text-xl font-bold text-accent">${upgradePricing.finalPrice.toFixed(2)}</span>
                        </div>
                        <p className="pt-1 text-sm leading-6 text-text/55">
                          Your monthly subscription will be canceled, and you&apos;ll receive a prorated credit for the remaining days.
                        </p>
                      </div>
                    )}

                    {upgradePricing.upgradeType === 'lifetime-to-lifetime' && (
                      <div className="mt-5 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-text/55">New plan price</span>
                          <span className="font-semibold text-text">${upgradePricing.originalPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-text/55">Current plan credit</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">-${upgradePricing.credit.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-4 dark:border-white/10">
                          <span className="font-bold text-text">Upgrade cost</span>
                          <span className="text-xl font-bold text-accent">${upgradePricing.finalPrice.toFixed(2)}</span>
                        </div>
                        <p className="pt-1 text-sm leading-6 text-text/55">
                          Pay the difference to upgrade to a higher tier lifetime plan.
                        </p>
                      </div>
                    )}

                    {upgradePricing.upgradeType === 'subscription-to-subscription' && (
                      <div className="mt-5 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-text/55">New plan price</span>
                          <span className="font-semibold text-text">${upgradePricing.originalPrice.toFixed(2)}/month</span>
                        </div>
                        {upgradePricing.credit > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-text/55">Credit from current subscription</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">-${upgradePricing.credit.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-text/55">Total due today</span>
                          <span className="text-xl font-bold text-accent">${upgradePricing.finalPrice.toFixed(2)}</span>
                        </div>
                        <p className="border-t border-border pt-4 text-sm leading-6 text-text-muted dark:border-white/10">
                          You&apos;ll be charged the prorated difference today. Your new rate of ${upgradePricing.originalPrice.toFixed(2)}/month starts at your next billing period.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-[22px] border border-accent bg-accent-soft p-6">
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent">Confirm change</p>
                    <h3 className="mt-3 text-xl font-semibold text-text dark:text-[#fff3ea]">
                      {selectedPlan ? `Move to ${selectedPlan.name}` : 'Confirm selected plan'}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-text-muted">
                      {upgradePricing.upgradeType === 'subscription-to-subscription'
                        ? 'Your subscription will update after confirmation, and any proration is handled automatically.'
                        : 'Lifetime upgrades continue through checkout with your pricing details prefilled.'}
                    </p>
                    <div className="mt-6 flex flex-col gap-3">
                      <Button
                        variant="primary"
                        onClick={handleConfirmChange}
                        disabled={isSubmitting}
                        className="w-full"
                      >
                        {isSubmitting ? 'Processing...' : confirmLabelByType[upgradePricing.upgradeType]}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSelectedPlanCode(null);
                          setUpgradePricing(null);
                        }}
                        disabled={isSubmitting}
                        className="w-full"
                      >
                        Choose a Different Plan
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {calculatingPrice && (
                <div className="flex items-center justify-center rounded-[22px] border border-border bg-surface p-6 shadow-sm bg-surface-alt">
                  <div className="mr-3 h-8 w-8 animate-spin rounded-full border-b-2 border-accent"></div>
                  <span className="text-text-muted">Calculating upgrade price...</span>
                </div>
              )}
          </>
        )}
      </div>
    </Modal>
  );
}
