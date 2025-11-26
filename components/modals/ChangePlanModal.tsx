'use client';

import { useState, useEffect } from 'react';
import { fetchPlans, type Plan } from '@/lib/plans-config';
import { useToastStore } from '@/lib/toast-store';
import { stripeApi } from '@/lib/api-client';

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanCode: string;
  orgId: string;
  onSuccess?: () => void;
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
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
      setSelectedPlanCode(null); // Reset selection when opening
    }
  }, [isOpen]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const allPlans = await fetchPlans();
      
      // Filter to show only subscription plans (not lifetime or enterprise)
      const subscriptionPlans = allPlans.filter(
        plan => !plan.code.includes('_lifetime') && 
                plan.code !== 'enterprise'
      );
      
      setPlans(subscriptionPlans);
    } catch (error) {
      console.error('Failed to load plans:', error);
      addToast('error', 'Failed to load available plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planCode: string) => {
    if (planCode === currentPlanCode) {
      addToast('info', 'You are already on this plan');
      return;
    }
    setSelectedPlanCode(planCode);
  };

  const handleConfirmChange = async () => {
    if (!selectedPlanCode) {
      addToast('error', 'Please select a plan');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Call backend API to update subscription in Stripe
      await stripeApi.updateSubscription(orgId, selectedPlanCode);
      
      // 2. Wait for webhook to process and update database (2.5 seconds)
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // 3. Refresh subscription data from database
      await onSuccess?.();
      
      // 4. Show success message and close modal
      addToast('success', 'Subscription plan updated successfully!');
      onClose();
    } catch (error: any) {
      console.error('Failed to change plan:', error);
      addToast('error', error.message || 'Failed to update subscription plan');
      setSelectedPlanCode(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4 min-h-screen overflow-hidden">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-orange">
                Change Subscription Plan
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Select a new plan to upgrade or downgrade your subscription. Changes take effect immediately.
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
        <div className="p-6">
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

                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-xl p-6 transition-all ${
                        isCurrent
                          ? 'bg-gray-50 dark:bg-[#252525] border-2 border-orange'
                          : isSelected
                          ? 'bg-gray-50 dark:bg-[#252525] border-2 border-orange ring-2 ring-orange/50'
                          : 'bg-gray-50 dark:bg-[#252525] border-2 border-gray-200 dark:border-[#333] hover:border-orange/50'
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

                      {/* Plan Name */}
                      <h3 className="text-xl font-bold text-orange mb-2">
                        {plan.name}
                      </h3>

                      {/* Price */}
                      <div className="mb-4">
                        <div className="text-4xl font-black text-gray-900 dark:text-white">
                          ${plan.monthly?.amount.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">
                          /month
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        {plan.description}
                      </p>

                      {/* Features */}
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, idx) => (
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

                      {/* Action Button */}
                      {isCurrent ? (
                        <button
                          disabled
                          className="w-full py-3 px-4 rounded-lg font-bold border-2 border-orange text-orange cursor-not-allowed opacity-60"
                        >
                          Current Plan
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSelectPlan(plan.code)}
                          disabled={isSubmitting}
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
                  );
                })}
              </div>

              {/* Confirmation Section */}
              {selectedPlanCode && (
                <div className="bg-gray-100 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Your card will be charged the prorated difference immediately.
                      </p>
                      {plans.find(p => p.code === selectedPlanCode) && (
                        <p className="text-gray-900 dark:text-white font-semibold">
                          Selected: {plans.find(p => p.code === selectedPlanCode)?.name} - ${plans.find(p => p.code === selectedPlanCode)?.monthly?.amount.toFixed(2)}/month
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedPlanCode(null)}
                        disabled={isSubmitting}
                        className="px-6 py-3 rounded-lg font-bold border-2 border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-500 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmChange}
                        disabled={isSubmitting}
                        className="px-6 py-3 rounded-lg font-bold bg-orange hover:bg-orange-dark text-white transition-colors disabled:opacity-50 disabled:cursor-wait min-w-[180px]"
                      >
                        {isSubmitting ? 'Updating subscription...' : 'Confirm Change'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

