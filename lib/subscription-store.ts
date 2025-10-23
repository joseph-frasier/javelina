import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PlanId = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'inactive' | 'trialing' | 'past_due' | 'canceled';

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  description: string;
  popular?: boolean;
}

export interface Subscription {
  id: string;
  planId: PlanId;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionState {
  selectedPlan: Plan | null;
  subscription: Subscription | null;
  isProcessing: boolean;
  selectPlan: (planId: PlanId) => void;
  processPayment: (paymentDetails: any) => Promise<{ success: boolean; error?: string }>;
  getSubscription: () => Subscription | null;
  cancelSubscription: () => Promise<{ success: boolean; error?: string }>;
  clearSelectedPlan: () => void;
}

// Mock plan data
export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    description: 'Perfect for getting started',
    features: [
      '1 organization',
      '2 environments',
      '10 DNS zones',
      'Basic DNS records',
      'Community support',
      '24-hour DNS propagation',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    interval: 'month',
    description: 'For growing teams',
    popular: true,
    features: [
      '5 organizations',
      'Unlimited environments',
      'Unlimited DNS zones',
      'All record types',
      'Priority email support',
      'Advanced analytics',
      '1-hour DNS propagation',
      'API access',
      'Team collaboration',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    interval: 'month',
    description: 'For large-scale operations',
    features: [
      'Unlimited organizations',
      'Unlimited environments',
      'Unlimited DNS zones',
      'All record types',
      '24/7 phone & email support',
      'Advanced analytics & reporting',
      'Instant DNS propagation',
      'Full API access',
      'Team collaboration',
      'SSO & SAML integration',
      'Custom SLA',
      'Dedicated account manager',
    ],
  },
];

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      selectedPlan: null,
      subscription: null,
      isProcessing: false,

      selectPlan: (planId: PlanId) => {
        const plan = PLANS.find((p) => p.id === planId);
        if (plan) {
          set({ selectedPlan: plan });
        }
      },

      processPayment: async (paymentDetails: any) => {
        set({ isProcessing: true });

        // Simulate payment processing delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        try {
          const selectedPlan = get().selectedPlan;

          if (!selectedPlan) {
            set({ isProcessing: false });
            return { success: false, error: 'No plan selected' };
          }

          // Mock successful payment - create subscription
          const now = new Date();
          const endDate = new Date(now);
          endDate.setMonth(endDate.getMonth() + 1);

          const subscription: Subscription = {
            id: `sub_${Math.random().toString(36).substr(2, 9)}`,
            planId: selectedPlan.id,
            status: 'active',
            currentPeriodStart: now.toISOString(),
            currentPeriodEnd: endDate.toISOString(),
            cancelAtPeriodEnd: false,
          };

          set({
            subscription,
            isProcessing: false,
            selectedPlan: null, // Clear after successful payment
          });

          return { success: true };
        } catch (error: any) {
          set({ isProcessing: false });
          return {
            success: false,
            error: error.message || 'Payment processing failed',
          };
        }
      },

      getSubscription: () => {
        return get().subscription;
      },

      cancelSubscription: async () => {
        set({ isProcessing: true });

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        try {
          const subscription = get().subscription;

          if (!subscription) {
            set({ isProcessing: false });
            return { success: false, error: 'No active subscription' };
          }

          // Update subscription to cancel at period end
          set({
            subscription: {
              ...subscription,
              cancelAtPeriodEnd: true,
            },
            isProcessing: false,
          });

          return { success: true };
        } catch (error: any) {
          set({ isProcessing: false });
          return {
            success: false,
            error: error.message || 'Failed to cancel subscription',
          };
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

