/**
 * Plans Configuration (Dynamic from Database)
 * 
 * Fetches subscription plans with Stripe price IDs from the database
 * Used by pricing page, checkout flow, and subscription management
 * 
 * NOTE: Price IDs are now stored in the database, not hardcoded!
 * To update prices, run a database migration, not a code deployment.
 */

import { plansApi } from './api-client';

export interface PlanFeature {
  name: string;
  included: boolean;
  limit?: number | string;
}

export interface PlanPrice {
  amount: number;
  priceId: string;
  interval: 'month' | 'year';
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  popular?: boolean;
  monthly?: PlanPrice;
  annual?: PlanPrice;
  features: PlanFeature[];
  limits: {
    environments: number;
    zones: number;
    dnsRecords: number;
    teamMembers: number;
  };
  booleanFeatures: {
    apiAccess: boolean;
    advancedAnalytics: boolean;
    prioritySupport: boolean;
    auditLogs: boolean;
    customRoles: boolean;
    sso: boolean;
    bulkOperations: boolean;
    exportData: boolean;
  };
}

// Database plan format (from API)
interface DbPlan {
  id: string;
  code: string;
  name: string;
  billing_interval: 'month' | 'year' | null;
  metadata: {
    price: number;
    price_id: string;
    description?: string;
    contact_sales?: boolean;
  };
  entitlements?: Array<{
    key: string;
    value: string;
    value_type: 'boolean' | 'numeric' | 'text';
  }>;
}

/**
 * Convert database plan format to frontend Plan format
 * Handles both lifetime plans and monthly subscription plans
 */
function convertDbPlanToPlan(dbPlans: DbPlan[]): Plan[] {
  console.log('Converting plans from API:', dbPlans);
  
  if (!dbPlans || !Array.isArray(dbPlans)) {
    console.error('Invalid dbPlans data:', dbPlans);
    return [];
  }
  
  // Map each plan
  const plans: Plan[] = dbPlans.map(dbPlan => {
    const baseCode = dbPlan.code; // e.g., 'starter', 'starter_lifetime', 'pro', etc.
    const isLifetime = dbPlan.billing_interval === null;
    const isContactSales = dbPlan.metadata?.contact_sales === true;
    
    // Get hardcoded limits for this plan
    const hardcodedLimits = HARDCODED_PLAN_LIMITS[baseCode] || HARDCODED_PLAN_LIMITS['starter'];
    
    // Determine base tier for features (starter, pro, business/premium, enterprise)
    const baseTier = baseCode.replace('_lifetime', '').replace('premium', 'business');
    
    // Build Plan object
    const plan: Plan = {
      id: baseCode,
      code: dbPlan.code,
      name: dbPlan.name,
      description: dbPlan.metadata?.description || '',
      popular: baseCode === 'pro_lifetime' || baseCode === 'pro', // Mark Pro plans as popular
      limits: {
        environments: hardcodedLimits.environments,
        zones: hardcodedLimits.zones,
        dnsRecords: hardcodedLimits.records,
        teamMembers: hardcodedLimits.users,
      },
      booleanFeatures: {
        apiAccess: !baseTier.includes('starter'),
        advancedAnalytics: !baseTier.includes('starter'),
        prioritySupport: !baseTier.includes('starter'),
        auditLogs: !baseTier.includes('starter'),
        customRoles: baseTier.includes('business') || baseTier.includes('enterprise'),
        sso: baseTier.includes('enterprise'),
        bulkOperations: !baseTier.includes('starter'),
        exportData: !baseTier.includes('starter'),
      },
      features: buildFeaturesList(baseCode, new Map()),
    };
    
    // Add pricing based on plan type
    if (!isContactSales && dbPlan.metadata?.price !== undefined && dbPlan.metadata?.price_id) {
      if (isLifetime) {
        // Lifetime plan - one-time payment
        plan.monthly = {
          amount: dbPlan.metadata.price,
          priceId: dbPlan.metadata.price_id,
          interval: 'month', // Still labeled as month for compatibility
        };
      } else {
        // Monthly subscription plan
        plan.monthly = {
          amount: dbPlan.metadata.price,
          priceId: dbPlan.metadata.price_id,
          interval: 'month',
        };
      }
    }
    
    return plan;
  });
  
  // Sort plans by type and tier
  const order = [
    // Lifetime plans first
    'starter_lifetime', 'pro_lifetime', 'premium_lifetime', 'enterprise_lifetime',
    // Then subscription plans
    'starter', 'pro', 'business', 'enterprise'
  ];
  plans.sort((a, b) => {
    const aIndex = order.indexOf(a.id);
    const bIndex = order.indexOf(b.id);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
  
  console.log('Converted plans:', plans);
  return plans;
}

/**
 * Hardcoded plan limits (not from database)
 * These are the actual limits enforced by Launch Darkly
 */
const HARDCODED_PLAN_LIMITS: Record<string, {
  organizations: number;
  users: number;
  environments: number;
  zones: number;
  records: number;
  queries: string;
}> = {
  // Lifetime Plans
  'starter_lifetime': {
    organizations: 1,
    users: 1,
    environments: 2,
    zones: 2,
    records: 200,
    queries: '5m',
  },
  'pro_lifetime': {
    organizations: 1,
    users: 5,
    environments: 20,
    zones: 20,
    records: 2000,
    queries: '50m',
  },
  'premium_lifetime': {
    organizations: 1,
    users: 20,
    environments: 50,
    zones: 50,
    records: 5000,
    queries: '500m',
  },
  'enterprise_lifetime': {
    organizations: -1, // Custom
    users: -1, // Custom
    environments: -1, // Custom
    zones: -1, // Custom
    records: -1, // Custom
    queries: 'Custom',
  },
  
  // Monthly Subscription Plans (same limits as lifetime counterparts)
  'starter': {
    organizations: 1,
    users: 1,
    environments: 2,
    zones: 2,
    records: 200,
    queries: '5m',
  },
  'pro': {
    organizations: 1,
    users: 5,
    environments: 20,
    zones: 20,
    records: 2000,
    queries: '50m',
  },
  'business': {
    organizations: 1,
    users: 20,
    environments: 50,
    zones: 50,
    records: 5000,
    queries: '500m',
  },
  'enterprise': {
    organizations: -1, // Custom
    users: -1, // Custom
    environments: -1, // Custom
    zones: -1, // Custom
    records: -1, // Custom
    queries: 'Custom',
  },
};

/**
 * Build features list based on hardcoded limits
 */
function buildFeaturesList(planId: string, entitlements: Map<string, string>): PlanFeature[] {
  const features: PlanFeature[] = [];
  const limits = HARDCODED_PLAN_LIMITS[planId];
  
  if (!limits) {
    return features;
  }
  
  // Add organization limit
  if (limits.organizations === -1) {
    features.push({
      name: 'Organizations: Custom',
      included: true,
    });
  } else {
    features.push({
      name: `${limits.organizations} Organization${limits.organizations === 1 ? '' : 's'}`,
      included: true,
    });
  }
  
  // Add user limit
  if (limits.users === -1) {
    features.push({
      name: 'User Accounts: Custom',
      included: true,
    });
  } else {
    features.push({
      name: `${limits.users} ${limits.users === 1 ? 'single user' : 'user accounts'}`,
      included: true,
    });
  }
  
  // Add environment limit
  if (limits.environments === -1) {
    features.push({
      name: 'Environments: Custom',
      included: true,
    });
  } else {
    features.push({
      name: `${limits.environments} Environment${limits.environments === 1 ? '' : 's'}`,
      included: true,
    });
  }
  
  // Add zones limit
  if (limits.zones === -1) {
    features.push({
      name: 'Zones/Domains: Custom',
      included: true,
    });
  } else {
    features.push({
      name: `${limits.zones} Zones/Domains`,
      included: true,
    });
  }
  
  // Add records limit
  if (limits.records === -1) {
    features.push({
      name: 'Records: Custom',
      included: true,
    });
  } else {
    features.push({
      name: `${limits.records} records total`,
      included: true,
    });
  }
  
  // Add queries limit
  features.push({
    name: `${limits.queries} Queries`,
    included: true,
  });
  
  return features;
}

// Cache for plans (client-side only)
let plansCache: Plan[] | null = null;
let plansCacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fallback static plans configuration
 * Used when backend is unavailable or during migration
 */
const FALLBACK_PLANS: Plan[] = [
  {
    id: 'starter_lifetime',
    code: 'starter_lifetime',
    name: 'Starter Lifetime',
    description: 'Perfect for small projects and testing',
    popular: false,
    monthly: {
      amount: 9.95,
      priceId: 'price_starter_monthly',
      interval: 'month',
    },
    features: [
      { name: '1 Organization', included: true },
      { name: '1 single user', included: true },
      { name: '2 Environments', included: true },
      { name: '2 Zones/Domains', included: true },
      { name: '200 records total', included: true },
      { name: '5m Queries', included: true },
    ],
    limits: {
      environments: 2,
      zones: 2,
      dnsRecords: 200,
      teamMembers: 1,
    },
    booleanFeatures: {
      apiAccess: false,
      advancedAnalytics: false,
      prioritySupport: false,
      auditLogs: false,
      customRoles: false,
      sso: false,
      bulkOperations: false,
      exportData: false,
    },
  },
  {
    id: 'pro_lifetime',
    code: 'pro_lifetime',
    name: 'Pro Lifetime',
    description: 'For growing teams and production workloads',
    popular: true,
    monthly: {
      amount: 49.95,
      priceId: 'price_pro_monthly',
      interval: 'month',
    },
    features: [
      { name: '1 Organization', included: true },
      { name: '5 user accounts', included: true },
      { name: '20 Environments', included: true },
      { name: '20 Zones/domains', included: true },
      { name: '2000 records total', included: true },
      { name: '50m queries', included: true },
    ],
    limits: {
      environments: 20,
      zones: 20,
      dnsRecords: 2000,
      teamMembers: 5,
    },
    booleanFeatures: {
      apiAccess: true,
      advancedAnalytics: true,
      prioritySupport: true,
      auditLogs: true,
      customRoles: false,
      sso: false,
      bulkOperations: true,
      exportData: true,
    },
  },
  {
    id: 'premium_lifetime',
    code: 'premium_lifetime',
    name: 'Business Lifetime',
    description: 'Advanced features for enterprise teams',
    popular: false,
    monthly: {
      amount: 199.95,
      priceId: 'price_premium_monthly',
      interval: 'month',
    },
    features: [
      { name: '1 Organization', included: true },
      { name: '20 user accounts', included: true },
      { name: '50 Environments', included: true },
      { name: '50 Zones/domains', included: true },
      { name: '5000 records total', included: true },
      { name: '500m queries', included: true },
    ],
    limits: {
      environments: 50,
      zones: 50,
      dnsRecords: 5000,
      teamMembers: 20,
    },
    booleanFeatures: {
      apiAccess: true,
      advancedAnalytics: true,
      prioritySupport: true,
      auditLogs: true,
      customRoles: true,
      sso: false,
      bulkOperations: true,
      exportData: true,
    },
  },
  {
    id: 'enterprise_lifetime',
    code: 'enterprise_lifetime',
    name: 'Enterprise Lifetime',
    description: 'Custom solutions for large organizations',
    popular: false,
    features: [
      { name: 'Organizations: Custom', included: true },
      { name: 'Pricing: Custom', included: true },
      { name: 'User Accounts: Custom', included: true },
      { name: 'Environments: Custom', included: true },
      { name: 'Zones/Domains: Custom', included: true },
    ],
    limits: {
      environments: -1,
      zones: -1,
      dnsRecords: -1,
      teamMembers: -1,
    },
    booleanFeatures: {
      apiAccess: true,
      advancedAnalytics: true,
      prioritySupport: true,
      auditLogs: true,
      customRoles: true,
      sso: true,
      bulkOperations: true,
      exportData: true,
    },
  },
];

/**
 * Fetch all plans from the API
 * Uses cache on client-side to avoid repeated API calls
 * Falls back to static config if API fails
 */
export async function fetchPlans(): Promise<Plan[]> {
  // Check cache (client-side only)
  if (typeof window !== 'undefined' && plansCache && Date.now() - plansCacheTimestamp < CACHE_TTL) {
    return plansCache;
  }
  
  try {
    const dbPlans = await plansApi.getAll() as DbPlan[];
    const plans = convertDbPlanToPlan(dbPlans);
    
    // If conversion resulted in empty plans, use fallback
    if (plans.length === 0) {
      console.warn('No plans returned from API, using fallback configuration');
      updateStaticConfig(FALLBACK_PLANS);
      return FALLBACK_PLANS;
    }
    
    // Update cache (client-side only)
    if (typeof window !== 'undefined') {
      plansCache = plans;
      plansCacheTimestamp = Date.now();
      // Also update static config for backwards compatibility
      updateStaticConfig(plans);
    }
    
    return plans;
  } catch (error) {
    console.error('Error fetching plans, using fallback configuration:', error);
    // Use fallback plans when API fails
    if (typeof window !== 'undefined') {
      updateStaticConfig(FALLBACK_PLANS);
    }
    return FALLBACK_PLANS;
  }
}

/**
 * Clear plans cache (useful after updating plans)
 */
export function clearPlansCache(): void {
  plansCache = null;
  plansCacheTimestamp = 0;
}

// =====================================================
// STATIC EXPORT FOR BACKWARDS COMPATIBILITY
// =====================================================

/**
 * Static plans config for synchronous access (e.g., Zustand stores)
 * This gets populated after the first fetchPlans() call
 * Initialized with fallback plans for immediate availability
 */
export let PLANS_CONFIG: Plan[] = FALLBACK_PLANS;

/**
 * Internal helper to populate the static config
 */
function updateStaticConfig(plans: Plan[]): void {
  PLANS_CONFIG = plans;
}

/**
 * Helper: Get plan by ID from a plans array
 */
export function getPlanById(plans: Plan[], id: string): Plan | undefined {
  return plans.find((p) => p.id === id);
}

/**
 * Helper: Get plan by code from a plans array
 */
export function getPlanByCode(plans: Plan[], code: string): Plan | undefined {
  return plans.find((p) => p.code === code);
}

/**
 * Helper: Get price ID for a plan and interval
 */
export function getPriceId(plan: Plan, interval: 'month' | 'year'): string | null {
  if (!plan) return null;

  if (interval === 'month' && plan.monthly) {
    return plan.monthly.priceId;
  }
  if (interval === 'year' && plan.annual) {
    return plan.annual.priceId;
  }

  return null;
}

/**
 * Helper: Format price for display
 */
export function formatPrice(amount: number, interval?: 'month' | 'year'): string {
  if (amount === 0) return 'Free';
  const formatted = amount.toFixed(2);
  return interval ? `$${formatted}/${interval}` : `$${formatted}`;
}

/**
 * Helper: Calculate annual savings
 */
export function calculateAnnualSavings(plan: Plan): number {
  if (!plan.monthly || !plan.annual) return 0;
  const monthlyTotal = plan.monthly.amount * 12;
  const annualTotal = plan.annual.amount;
  return monthlyTotal - annualTotal;
}

/**
 * Helper: Check if plan has a specific feature
 */
export function planHasFeature(
  plan: Plan,
  feature: keyof Plan['booleanFeatures']
): boolean {
  return plan?.booleanFeatures[feature] ?? false;
}

/**
 * Helper: Get plan limit for a resource
 */
export function getPlanLimit(
  plan: Plan,
  resource: keyof Plan['limits']
): number {
  return plan?.limits[resource] ?? 0;
}

/**
 * Helper: Check if a plan is a lifetime plan
 */
export function isLifetimePlan(planCode: string): boolean {
  return planCode.includes('_lifetime');
}

/**
 * Helper: Get plan tier (starter, pro, business/premium, enterprise)
 */
export function getPlanTier(planCode: string): string {
  const baseTier = planCode.replace('_lifetime', '');
  // Normalize business/premium to business
  return baseTier === 'premium' ? 'business' : baseTier;
}

/**
 * Helper: Get plan tier level (for comparison)
 */
export function getPlanTierLevel(planCode: string): number {
  const tier = getPlanTier(planCode);
  const levels: Record<string, number> = {
    starter: 1,
    pro: 2,
    business: 3,
    premium: 3,
    enterprise: 4,
  };
  return levels[tier] || 0;
}

/**
 * Helper: Check if upgrade is valid
 * Returns true if targetPlan is a valid upgrade from currentPlan
 */
export function isValidUpgrade(currentPlanCode: string, targetPlanCode: string): boolean {
  // Can't "upgrade" to the same plan
  if (currentPlanCode === targetPlanCode) {
    return false;
  }
  
  // Enterprise plans require contacting sales
  if (targetPlanCode === 'enterprise' || targetPlanCode === 'enterprise_lifetime') {
    return false;
  }
  
  const currentIsLifetime = isLifetimePlan(currentPlanCode);
  const targetIsLifetime = isLifetimePlan(targetPlanCode);
  const currentTierLevel = getPlanTierLevel(currentPlanCode);
  const targetTierLevel = getPlanTierLevel(targetPlanCode);
  
  // Lifetime users cannot downgrade
  if (currentIsLifetime && targetTierLevel < currentTierLevel) {
    return false;
  }
  
  // Lifetime users can only upgrade to higher lifetime tiers
  if (currentIsLifetime && !targetIsLifetime) {
    return false;
  }
  
  // Monthly users can upgrade to same or higher tier (either monthly or lifetime)
  if (!currentIsLifetime && targetTierLevel >= currentTierLevel) {
    return true;
  }
  
  // Lifetime users can upgrade to higher lifetime tiers
  if (currentIsLifetime && targetIsLifetime && targetTierLevel > currentTierLevel) {
    return true;
  }
  
  return false;
}

/**
 * Helper: Get upgrade type
 */
export function getUpgradeType(currentPlanCode: string, targetPlanCode: string): 
  'subscription-to-lifetime' | 'lifetime-to-lifetime' | 'subscription-to-subscription' | 'invalid' {
  
  if (!isValidUpgrade(currentPlanCode, targetPlanCode)) {
    return 'invalid';
  }
  
  const currentIsLifetime = isLifetimePlan(currentPlanCode);
  const targetIsLifetime = isLifetimePlan(targetPlanCode);
  
  if (!currentIsLifetime && targetIsLifetime) {
    return 'subscription-to-lifetime';
  }
  
  if (currentIsLifetime && targetIsLifetime) {
    return 'lifetime-to-lifetime';
  }
  
  if (!currentIsLifetime && !targetIsLifetime) {
    return 'subscription-to-subscription';
  }
  
  return 'invalid';
}

/**
 * Helper: Calculate upgrade price difference (for lifetime to lifetime)
 */
export function calculateLifetimeUpgradePrice(
  currentPlan: Plan,
  targetPlan: Plan
): number {
  const currentPrice = currentPlan.monthly?.amount || 0;
  const targetPrice = targetPlan.monthly?.amount || 0;
  
  // For lifetime plans, the difference is simply the price difference
  return Math.max(0, targetPrice - currentPrice);
}

