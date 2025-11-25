'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
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
    }
  }, [isOpen]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const allPlans = await fetchPlans();
      
      // Filter to show only subscription plans (not lifetime or enterprise)
      const subscriptionPlans = allPlans.filter(
        plan => !plan.code.includes('_lifetime') && 
                plan.code !== 'enterprise' &&
                plan.code !== currentPlanCode // Exclude current plan
      );
      
      setPlans(subscriptionPlans);
    } catch (error) {
      console.error('Failed to load plans:', error);
      addToast('error', 'Failed to load available plans');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedPlanCode) {
      addToast('error', 'Please select a plan');
      return;
    }

    try {
      setIsSubmitting(true);
      
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
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-light p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-orange-dark">
              Change Subscription Plan
            </h2>
            <button
              onClick={onClose}
              className="text-gray-slate hover:text-orange-dark transition-colors"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-slate mt-2">
            Select a new plan to upgrade or downgrade your subscription. Changes take effect immediately.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanCode(plan.code)}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPlanCode === plan.code
                      ? 'border-orange bg-orange-light/30'
                      : 'border-gray-light hover:border-orange/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-orange-dark">
                          {plan.name}
                        </h3>
                        {plan.popular && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange text-white">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-slate mb-3">
                        {plan.description}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {plan.features.slice(0, 4).map((feature, idx) => (
                          <div key={idx} className="flex items-start">
                            <svg className="w-4 h-4 text-orange mr-1.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-xs text-gray-slate">
                              {feature.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-black text-orange-dark">
                        ${plan.monthly?.amount.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-slate">
                        /month
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-light p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-slate">
              Your card will be charged the prorated difference immediately.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleChangePlan}
                disabled={!selectedPlanCode || isSubmitting}
              >
                {isSubmitting ? 'Updating subscription...' : 'Confirm Change'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

