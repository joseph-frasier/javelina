/**
 * Upgrade Helper Functions
 * 
 * Functions to calculate and process plan upgrades
 * Used by both frontend and backend
 */

import type { Plan } from './plans-config';
import type { Subscription } from '@/types/billing';

/**
 * Calculate prorated credit from current subscription
 * 
 * @param currentPeriodStart - Start of current billing period (ISO string)
 * @param currentPeriodEnd - End of current billing period (ISO string)
 * @param monthlyPrice - Monthly subscription price
 * @returns Credit amount for remaining days
 */
export function calculateProratedCredit(
  currentPeriodStart: string,
  currentPeriodEnd: string,
  monthlyPrice: number
): number {
  const now = new Date();
  const periodStart = new Date(currentPeriodStart);
  const periodEnd = new Date(currentPeriodEnd);
  
  // Calculate total days in period
  const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate days remaining
  const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Don't give negative credit
  if (daysRemaining <= 0) {
    return 0;
  }
  
  // Calculate daily rate and credit
  const dailyRate = monthlyPrice / totalDays;
  const credit = dailyRate * daysRemaining;
  
  // Round to 2 decimal places
  return Math.round(credit * 100) / 100;
}

/**
 * Calculate upgrade pricing for subscription → lifetime
 * 
 * @param subscription - Current subscription
 * @param targetPlan - Target lifetime plan
 * @returns Pricing breakdown
 */
export function calculateSubscriptionToLifetimeUpgrade(
  subscription: Subscription,
  currentPlanPrice: number,
  targetPlan: Plan
): {
  originalPrice: number;
  credit: number;
  finalPrice: number;
} {
  const lifetimePrice = targetPlan.monthly?.amount || 0;
  
  // Calculate prorated credit from remaining subscription
  const credit = subscription.current_period_start && subscription.current_period_end
    ? calculateProratedCredit(
        subscription.current_period_start,
        subscription.current_period_end,
        currentPlanPrice
      )
    : 0;
  
  const finalPrice = Math.max(0, lifetimePrice - credit);
  
  return {
    originalPrice: lifetimePrice,
    credit: Math.round(credit * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
  };
}

/**
 * Calculate upgrade pricing for lifetime → lifetime
 * 
 * @param currentPlan - Current lifetime plan
 * @param targetPlan - Target lifetime plan
 * @returns Pricing breakdown
 */
export function calculateLifetimeToLifetimeUpgrade(
  currentPlan: Plan,
  targetPlan: Plan
): {
  originalPrice: number;
  credit: number;
  finalPrice: number;
} {
  const currentPrice = currentPlan.monthly?.amount || 0;
  const targetPrice = targetPlan.monthly?.amount || 0;
  
  const priceDifference = Math.max(0, targetPrice - currentPrice);
  
  return {
    originalPrice: targetPrice,
    credit: currentPrice,
    finalPrice: Math.round(priceDifference * 100) / 100,
  };
}

/**
 * Calculate upgrade pricing for subscription → subscription
 * (Fallback if Stripe preview fails)
 * 
 * @param subscription - Current subscription
 * @param currentMonthlyPrice - Current plan's monthly price
 * @param targetMonthlyPrice - Target plan's monthly price
 * @returns Pricing breakdown
 */
export function calculateSubscriptionToSubscriptionUpgrade(
  subscription: Subscription,
  currentMonthlyPrice: number,
  targetMonthlyPrice: number
): {
  originalPrice: number;
  credit: number;
  finalPrice: number;
} {
  // Calculate prorated credit from remaining subscription
  const credit = subscription.current_period_start && subscription.current_period_end
    ? calculateProratedCredit(
        subscription.current_period_start,
        subscription.current_period_end,
        currentMonthlyPrice
      )
    : 0;
  
  // Calculate prorated cost for new plan for remaining days
  const now = new Date();
  const periodEnd = subscription.current_period_end 
    ? new Date(subscription.current_period_end)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const periodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start)
    : new Date();
  
  const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  
  const newPlanDailyRate = targetMonthlyPrice / totalDays;
  const newPlanProrated = newPlanDailyRate * daysRemaining;
  
  // Final price is the difference (new prorated - old credit)
  const finalPrice = Math.max(0, newPlanProrated - credit);
  
  return {
    originalPrice: targetMonthlyPrice,
    credit: Math.round(credit * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
  };
}

/**
 * Validate upgrade request
 * 
 * @param currentPlanCode - Current plan code
 * @param targetPlanCode - Target plan code
 * @param currentIsLifetime - Whether current plan is lifetime
 * @returns Validation result
 */
export function validateUpgradeRequest(
  currentPlanCode: string,
  targetPlanCode: string,
  currentIsLifetime: boolean
): { valid: boolean; error?: string } {
  // Can't upgrade to same plan
  if (currentPlanCode === targetPlanCode) {
    return { valid: false, error: 'Already on this plan' };
  }
  
  // Enterprise requires contact sales
  if (targetPlanCode === 'enterprise' || targetPlanCode === 'enterprise_lifetime') {
    return { valid: false, error: 'Enterprise plans require contacting sales' };
  }
  
  const targetIsLifetime = targetPlanCode.includes('_lifetime');
  
  // Lifetime users can only upgrade to higher lifetime tiers
  if (currentIsLifetime && !targetIsLifetime) {
    return { valid: false, error: 'Cannot downgrade from lifetime to subscription' };
  }
  
  // Get tier levels for comparison
  const currentTier = currentPlanCode.replace('_lifetime', '');
  const targetTier = targetPlanCode.replace('_lifetime', '');
  
  const tierLevels: Record<string, number> = {
    starter: 1,
    pro: 2,
    business: 3,
    premium: 3,
    enterprise: 4,
  };
  
  const currentLevel = tierLevels[currentTier] || 0;
  const targetLevel = tierLevels[targetTier] || 0;
  
  // Lifetime users cannot downgrade
  if (currentIsLifetime && targetLevel < currentLevel) {
    return { valid: false, error: 'Cannot downgrade lifetime plans' };
  }
  
  // Must be upgrading to same or higher tier
  if (targetLevel < currentLevel) {
    return { valid: false, error: 'Downgrades are not allowed for lifetime plans' };
  }
  
  return { valid: true };
}

/**
 * Format price for display
 */
export function formatUpgradePrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Get upgrade summary message
 */
export function getUpgradeSummary(
  currentPlanName: string,
  targetPlanName: string,
  upgradeType: 'subscription-to-lifetime' | 'lifetime-to-lifetime' | 'subscription-to-subscription'
): string {
  switch (upgradeType) {
    case 'subscription-to-lifetime':
      return `Upgrade from ${currentPlanName} subscription to ${targetPlanName} lifetime`;
    case 'lifetime-to-lifetime':
      return `Upgrade from ${currentPlanName} lifetime to ${targetPlanName} lifetime`;
    case 'subscription-to-subscription':
      return `Change from ${currentPlanName} to ${targetPlanName} subscription`;
    default:
      return 'Plan upgrade';
  }
}

