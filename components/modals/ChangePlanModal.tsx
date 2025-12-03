'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchPlans, type Plan, isValidUpgrade, getUpgradeType, calculateLifetimeUpgradePrice, isLifetimePlan } from '@/lib/plans-config';
import { useToastStore } from '@/lib/toast-store';
import { stripeApi } from '@/lib/api-client';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

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
  const [shouldRender, setShouldRender] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle opening/closing with animation
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    }
  }, [isOpen]);

  // GSAP Opening Animation
  useGSAP(() => {
    if (!shouldRender) return;

    if (isOpen && modalRef.current && overlayRef.current) {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );

      gsap.fromTo(
        modalRef.current,
        { scale: 0.95, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }
      );
    }
  }, [isOpen, shouldRender]);

  // GSAP Closing Animation
  useEffect(() => {
    if (!shouldRender) return;
    if (isOpen) return;

    if (modalRef.current && overlayRef.current) {
      gsap.killTweensOf([modalRef.current, overlayRef.current]);

      const tl = gsap.timeline({
        onComplete: () => setShouldRender(false)
      });

      tl.to(overlayRef.current, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in'
      });

      tl.to(modalRef.current, {
        scale: 0.95,
        opacity: 0,
        y: 20,
        duration: 0.2,
        ease: 'power2.in'
      }, 0);
    }
  }, [isOpen, shouldRender]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
      setSelectedPlanCode(null); // Reset selection when opening
      setUpgradePricing(null);
    }
  }, [isOpen]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const allPlans = await fetchPlans();
      
      // Show all plans except enterprise (contact sales)
      const availablePlans = allPlans.filter(
        plan => plan.code !== 'enterprise' && plan.code !== 'enterprise_lifetime'
      );
      
      setPlans(availablePlans);
    } catch (error) {
      console.error('Failed to load plans:', error);
      addToast('error', 'Failed to load available plans');
    } finally {
      setLoading(false);
    }
  };

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

  if (!shouldRender) return null;

  const currentIsLifetime = isLifetimePlan(currentPlanCode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 min-h-screen overflow-hidden">
      {/* Overlay */}
      <div 
        ref={overlayRef}
        className="fixed inset-0 bg-black/50 dark:bg-black/70"
        onClick={onClose}
      />
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-orange">
                {currentIsLifetime ? 'Upgrade Lifetime Plan' : 'Change Subscription Plan'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {currentIsLifetime 
                  ? 'Upgrade to a higher tier lifetime plan. Downgrades are not available for lifetime plans.'
                  : 'Upgrade to a lifetime plan or change your monthly subscription.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 pb-16 sm:pb-12">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
            </div>
          ) : (
            <>
              {/* Plan Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {plans.map((plan) => {
                  const isCurrent = plan.code === currentPlanCode;
                  const isSelected = selectedPlanCode === plan.code;
                  const isValidUpgradeOption = isValidUpgrade(currentPlanCode, plan.code);
                  const planIsLifetime = isLifetimePlan(plan.code);
                  const isDisabled = isCurrent || !isValidUpgradeOption;

                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-xl p-6 transition-all flex flex-col ${
                        isCurrent
                          ? 'bg-gray-50 dark:bg-[#252525] border-2 border-orange'
                          : isSelected
                          ? 'bg-gray-100 dark:bg-[#252525] border-2 border-orange ring-2 ring-orange/50'
                          : isDisabled
                          ? 'bg-gray-100 dark:bg-[#252525] border-2 border-gray-200 dark:border-[#333] opacity-50 cursor-not-allowed'
                          : 'bg-gray-100 dark:bg-[#252525] border-2 border-gray-200 dark:border-[#333] hover:border-orange/50 cursor-pointer'
                      }`}
                    >
                      {/* Popular Badge */}
                      {plan.popular && !isCurrent && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange text-white uppercase">
                            Popular
                          </span>
                        </div>
                      )}

                      {/* Current Plan Badge */}
                      {isCurrent && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange text-white uppercase">
                            Current Plan
                          </span>
                        </div>
                      )}

                      {/* Lifetime Badge */}
                      {planIsLifetime && !isCurrent && (
                        <div className="absolute -top-3 right-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-blue-600 text-white uppercase">
                            Lifetime
                          </span>
                        </div>
                      )}

                      {/* Plan Name */}
                      <h3 className="text-xl font-bold text-orange mb-2">
                        {plan.name}
                      </h3>

                      {/* Price */}
                      <div className="mb-4">
                        <div className="text-4xl font-black text-orange">
                          ${plan.monthly?.amount.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">
                          {planIsLifetime ? 'ONE-TIME' : '/MONTH'}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        {plan.description}
                      </p>

                      {/* Features */}
                      <ul className="space-y-3 mb-6 flex-grow">
                        {plan.features.slice(0, 5).map((feature, idx) => (
                          <li key={idx} className="flex items-start">
                            <svg className="w-5 h-5 text-orange mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {feature.name}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* Action Button - pushed to bottom with mt-auto */}
                      <div className="mt-auto">
                      {isCurrent ? (
                        <button
                          disabled
                          className="w-full py-3 px-4 rounded-lg font-bold border-2 border-orange text-orange cursor-not-allowed opacity-60"
                        >
                          Current Plan
                        </button>
                      ) : !isValidUpgradeOption ? (
                        <button
                          disabled
                            className="w-full py-3 px-4 rounded-lg font-bold border-2 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                        >
                          Not Available
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSelectPlan(plan.code)}
                          disabled={isSubmitting || calculatingPrice}
                          className={`w-full py-3 px-4 rounded-lg font-bold transition-colors ${
                            isSelected
                              ? 'bg-orange text-white border-2 border-orange'
                              : 'bg-transparent border-2 border-orange text-orange hover:bg-orange hover:text-white'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pricing Breakdown Section */}
              {selectedPlanCode && upgradePricing && !calculatingPrice && (
                <div className="bg-gray-100 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-bold text-orange mb-4">Upgrade Pricing</h3>
                  
                  {upgradePricing.upgradeType === 'subscription-to-lifetime' && (
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Lifetime Plan Price:</span>
                        <span className="text-gray-900 dark:text-white font-semibold">${upgradePricing.originalPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Credit from Current Subscription:</span>
                        <span className="text-green-600 dark:text-green-400 font-semibold">-${upgradePricing.credit.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-gray-300 dark:border-gray-600 pt-3 flex justify-between">
                        <span className="text-gray-900 dark:text-white font-bold">Total Due Today:</span>
                        <span className="text-orange font-bold text-xl">${upgradePricing.finalPrice.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Your monthly subscription will be canceled, and you&apos;ll receive a prorated credit for the remaining days.
                      </p>
                    </div>
                  )}
                  
                  {upgradePricing.upgradeType === 'lifetime-to-lifetime' && (
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">New Plan Price:</span>
                        <span className="text-gray-900 dark:text-white font-semibold">${upgradePricing.originalPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Current Plan Credit:</span>
                        <span className="text-green-600 dark:text-green-400 font-semibold">-${upgradePricing.credit.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-gray-300 dark:border-gray-600 pt-3 flex justify-between">
                        <span className="text-gray-900 dark:text-white font-bold">Upgrade Cost:</span>
                        <span className="text-orange font-bold text-xl">${upgradePricing.finalPrice.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Pay the difference to upgrade to a higher tier lifetime plan.
                      </p>
                    </div>
                  )}
                  
                  {upgradePricing.upgradeType === 'subscription-to-subscription' && (
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">New Plan Price:</span>
                        <span className="text-gray-900 dark:text-white font-semibold">${upgradePricing.originalPrice.toFixed(2)}/month</span>
                      </div>
                      {upgradePricing.credit > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Credit from Current Subscription:</span>
                          <span className="text-green-600 dark:text-green-400 font-semibold">-${upgradePricing.credit.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-300 dark:border-gray-600 pt-3 flex justify-between">
                        <span className="text-gray-900 dark:text-white font-bold">Total Due Today:</span>
                        <span className="text-orange font-bold text-xl">${upgradePricing.finalPrice.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        You&apos;ll be charged the prorated difference today. Your new rate of ${upgradePricing.originalPrice.toFixed(2)}/month starts at your next billing period.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {calculatingPrice && (
                <div className="bg-gray-100 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-lg p-6 mb-6 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange mr-3"></div>
                  <span className="text-gray-600 dark:text-gray-400">Calculating upgrade price...</span>
                </div>
              )}

              {/* Confirmation Section */}
              {selectedPlanCode && upgradePricing && !calculatingPrice && (
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setSelectedPlanCode(null);
                      setUpgradePricing(null);
                    }}
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-lg font-bold border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmChange}
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-lg font-bold bg-orange hover:bg-orange-dark text-white transition-colors disabled:opacity-50 disabled:cursor-wait min-w-[180px]"
                  >
                    {isSubmitting ? 'Processing...' : 'Confirm Upgrade'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
