import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PLANS_CONFIG, type Plan as PlanConfig } from './plans-config';

export type PlanId = 'free' | 'basic' | 'pro' | 'enterprise';

/**
 * Simplified plan interface for selected plan state
 * Used during checkout flow before real subscription is created
 */
export interface SelectedPlan {
  id: PlanId;
  name: string;
  price: number;
  priceId: string;
  interval: 'month' | 'year';
}

interface SubscriptionState {
  selectedPlan: SelectedPlan | null;
  selectedInterval: 'month' | 'year';
  selectPlan: (planId: PlanId, interval?: 'month' | 'year') => void;
  setInterval: (interval: 'month' | 'year') => void;
  clearSelectedPlan: () => void;
}

/**
 * Legacy plan format for backwards compatibility
 * Used by components that expect the old plan structure
 */
export interface Plan {
  id: string;
  name: string;
  price: number;
  priceId: string;
  interval: string;
  features: string[];
  description: string;
  popular?: boolean;
}

/**
 * Export PLANS for backwards compatibility
 * Maps from new plan config to old format
 */
export const PLANS: Plan[] = PLANS_CONFIG.map((plan) => ({
  id: plan.id as PlanId,
  name: plan.name,
  price: plan.monthly?.amount || 0,
  priceId: plan.monthly?.priceId || '',
  interval: 'month' as const,
  features: plan.features.filter(f => f.included).map(f => f.name),
  description: plan.description,
  popular: plan.popular,
}));

/**
 * Subscription store
 * 
 * Manages temporary state during plan selection and checkout flow
 * Real subscription data comes from /api/subscriptions/current
 */
export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      selectedPlan: null,
      selectedInterval: 'month',

      selectPlan: (planId: PlanId, interval: 'month' | 'year' = 'month') => {
        const planConfig = PLANS_CONFIG.find((p) => p.id === planId);
        if (!planConfig) return;

        const pricing = interval === 'year' && planConfig.annual
          ? planConfig.annual
          : planConfig.monthly;

        if (!pricing) return;

        set({
          selectedPlan: {
            id: planId,
            name: planConfig.name,
            price: pricing.amount,
            priceId: pricing.priceId,
            interval: pricing.interval,
          },
          selectedInterval: interval,
        });
      },

      setInterval: (interval: 'month' | 'year') => {
        set({ selectedInterval: interval });
        
        // Update selected plan if one is selected
        const currentPlan = get().selectedPlan;
        if (currentPlan) {
          const planConfig = PLANS_CONFIG.find((p) => p.id === currentPlan.id);
          if (planConfig) {
            const pricing = interval === 'year' && planConfig.annual
              ? planConfig.annual
              : planConfig.monthly;

            if (pricing) {
              set({
                selectedPlan: {
                  ...currentPlan,
                  price: pricing.amount,
                  priceId: pricing.priceId,
                  interval: pricing.interval,
                },
              });
            }
          }
        }
      },

      clearSelectedPlan: () => {
        set({ selectedPlan: null });
      },
    }),
    {
      name: 'subscription-storage',
    }
  )
);

