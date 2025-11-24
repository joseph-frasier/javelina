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
  };
  entitlements?: Array<{
    key: string;
    value: string;
    value_type: 'boolean' | 'numeric' | 'text';
  }>;
}

/**
 * Convert database plan format to frontend Plan format
 */
function convertDbPlanToPlan(dbPlans: DbPlan[]): Plan[] {
  // Group plans by their base code (e.g., 'basic_monthly' and 'basic_annual' -> 'basic')
  const planGroups = new Map<string, { monthly?: DbPlan; annual?: DbPlan }>();
  
  dbPlans.forEach(dbPlan => {
    let baseCode: string;
    let interval: 'monthly' | 'annual';
    
    if (dbPlan.code.endsWith('_monthly')) {
      baseCode = dbPlan.code.replace('_monthly', '');
      interval = 'monthly';
    } else if (dbPlan.code.endsWith('_annual')) {
      baseCode = dbPlan.code.replace('_annual', '');
      interval = 'annual';
    } else {
      // Fallback for any other format
      baseCode = dbPlan.code;
      interval = 'monthly';
    }
    
    const group = planGroups.get(baseCode) || {};
    group[interval] = dbPlan;
    planGroups.set(baseCode, group);
  });
  
  // Convert each group to a Plan
  const plans: Plan[] = [];
  
  planGroups.forEach((group, baseCode) => {
    // Use monthly plan as the primary source, or annual if monthly doesn't exist
    const primary = group.monthly || group.annual;
    if (!primary) return;
    
    // Extract entitlements (fallback to defaults if not present)
    const entitlements = new Map(
      (primary.entitlements || []).map(e => [e.key, e.value])
    );
    
    // Default to unlimited (-1) if entitlements don't exist
    const getNumericEntitlement = (key: string): number => {
      const val = entitlements.get(key);
      return val ? parseInt(val, 10) : -1; // Default to unlimited
    };
    
    const getBooleanEntitlement = (key: string): boolean => {
      const val = entitlements.get(key);
      return val ? val === 'true' : true; // Default to true if not present
    };
    
    // Build Plan object
    const plan: Plan = {
      id: baseCode,
      code: primary.code,
      name: primary.name.replace(' (Monthly)', '').replace(' (Annual)', ''),
      description: primary.metadata.description || '',
      popular: baseCode === 'pro', // Mark Pro as popular
      limits: {
        environments: getNumericEntitlement('environments_limit'),
        zones: getNumericEntitlement('zones_limit'),
        dnsRecords: getNumericEntitlement('dns_records_limit'),
        teamMembers: getNumericEntitlement('team_members_limit'),
      },
      booleanFeatures: {
        apiAccess: getBooleanEntitlement('api_access'),
        advancedAnalytics: getBooleanEntitlement('advanced_analytics'),
        prioritySupport: getBooleanEntitlement('priority_support'),
        auditLogs: getBooleanEntitlement('audit_logs'),
        customRoles: getBooleanEntitlement('custom_roles'),
        sso: getBooleanEntitlement('sso_enabled'),
        bulkOperations: getBooleanEntitlement('bulk_operations'),
        exportData: getBooleanEntitlement('export_data'),
      },
      features: buildFeaturesList(baseCode, entitlements),
    };
    
    // Add pricing
    if (group.monthly) {
      plan.monthly = {
        amount: group.monthly.metadata.price,
        priceId: group.monthly.metadata.price_id,
        interval: 'month',
      };
    }
    
    if (group.annual) {
      plan.annual = {
        amount: group.annual.metadata.price,
        priceId: group.annual.metadata.price_id,
        interval: 'year',
      };
    }
    
    plans.push(plan);
  });
  
  // Sort plans by order: starter, pro, premium, enterprise
  const order = ['starter_lifetime', 'pro_lifetime', 'premium_lifetime', 'enterprise_lifetime'];
  plans.sort((a, b) => {
    const aIndex = order.indexOf(a.id);
    const bIndex = order.indexOf(b.id);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
  
  return plans;
}

/**
 * Build features list based on entitlements
 */
function buildFeaturesList(planId: string, entitlements: Map<string, string>): PlanFeature[] {
  const features: PlanFeature[] = [];
  
  const envLimit = entitlements.get('environments_limit');
  const zonesLimit = entitlements.get('zones_limit');
  const dnsLimit = entitlements.get('dns_records_limit');
  const membersLimit = entitlements.get('team_members_limit');
  
  // Add limit features
  features.push({
    name: `${envLimit === '-1' ? 'Unlimited' : envLimit} Environment${envLimit === '1' ? '' : 's'}`,
    included: true,
  });
  
  features.push({
    name: `${zonesLimit === '-1' ? 'Unlimited' : zonesLimit} DNS Zone${zonesLimit === '1' ? '' : 's'}`,
    included: true,
  });
  
  features.push({
    name: `${dnsLimit === '-1' ? 'Unlimited' : dnsLimit} DNS Records per Zone`,
    included: true,
  });
  
  features.push({
    name: `${membersLimit === '-1' ? 'Unlimited' : membersLimit} Team Member${membersLimit === '1' ? '' : 's'}`,
    included: true,
  });
  
  // Add boolean features
  if (entitlements.get('bulk_operations') === 'true') {
    features.push({ name: 'Bulk Operations', included: true });
  }
  
  if (entitlements.get('export_data') === 'true') {
    features.push({ name: 'Export Data', included: true });
  }
  
  if (entitlements.get('api_access') === 'true') {
    features.push({ name: 'API Access', included: true });
  } else {
    features.push({ name: 'API Access', included: false });
  }
  
  if (entitlements.get('advanced_analytics') === 'true') {
    features.push({ name: 'Advanced Analytics', included: true });
  } else {
    features.push({ name: 'Advanced Analytics', included: false });
  }
  
  if (entitlements.get('priority_support') === 'true') {
    features.push({ name: 'Priority Support', included: true });
  } else {
    features.push({ name: 'Email Support', included: true });
  }
  
  if (entitlements.get('audit_logs') === 'true') {
    features.push({ name: 'Audit Logs', included: true });
  }
  
  if (entitlements.get('custom_roles') === 'true') {
    features.push({ name: 'Custom Roles', included: true });
  }
  
  if (entitlements.get('sso_enabled') === 'true') {
    features.push({ name: 'SSO / SAML', included: true });
  }
  
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
    name: 'Starter',
    description: 'Perfect for small projects and testing',
    popular: false,
    monthly: {
      amount: 20,
      priceId: 'price_starter_monthly',
      interval: 'month',
    },
    features: [
      { name: 'Unlimited Environments', included: true },
      { name: 'Unlimited DNS Zones', included: true },
      { name: 'Unlimited DNS Records per Zone', included: true },
      { name: 'Unlimited Team Members', included: true },
      { name: 'Email Support', included: true },
      { name: 'API Access', included: false },
      { name: 'Advanced Analytics', included: false },
    ],
    limits: {
      environments: -1,
      zones: -1,
      dnsRecords: -1,
      teamMembers: -1,
    },
    booleanFeatures: {
      apiAccess: false,
      advancedAnalytics: false,
      prioritySupport: false,
      auditLogs: false,
      customRoles: false,
      sso: false,
      bulkOperations: true,
      exportData: true,
    },
  },
  {
    id: 'pro_lifetime',
    code: 'pro_lifetime',
    name: 'Pro',
    description: 'For growing teams and production workloads',
    popular: true,
    monthly: {
      amount: 49,
      priceId: 'price_pro_monthly',
      interval: 'month',
    },
    features: [
      { name: 'Unlimited Environments', included: true },
      { name: 'Unlimited DNS Zones', included: true },
      { name: 'Unlimited DNS Records per Zone', included: true },
      { name: 'Unlimited Team Members', included: true },
      { name: 'API Access', included: true },
      { name: 'Advanced Analytics', included: true },
      { name: 'Priority Support', included: true },
      { name: 'Audit Logs', included: true },
      { name: 'Bulk Operations', included: true },
      { name: 'Export Data', included: true },
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
      customRoles: false,
      sso: false,
      bulkOperations: true,
      exportData: true,
    },
  },
  {
    id: 'premium_lifetime',
    code: 'premium_lifetime',
    name: 'Premium',
    description: 'Advanced features for enterprise teams',
    popular: false,
    monthly: {
      amount: 99,
      priceId: 'price_premium_monthly',
      interval: 'month',
    },
    features: [
      { name: 'Unlimited Environments', included: true },
      { name: 'Unlimited DNS Zones', included: true },
      { name: 'Unlimited DNS Records per Zone', included: true },
      { name: 'Unlimited Team Members', included: true },
      { name: 'API Access', included: true },
      { name: 'Advanced Analytics', included: true },
      { name: 'Priority Support', included: true },
      { name: 'Audit Logs', included: true },
      { name: 'Custom Roles', included: true },
      { name: 'Bulk Operations', included: true },
      { name: 'Export Data', included: true },
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
      sso: false,
      bulkOperations: true,
      exportData: true,
    },
  },
  {
    id: 'enterprise_lifetime',
    code: 'enterprise_lifetime',
    name: 'Enterprise',
    description: 'Custom solutions for large organizations',
    popular: false,
    features: [
      { name: 'Unlimited Everything', included: true },
      { name: 'API Access', included: true },
      { name: 'Advanced Analytics', included: true },
      { name: 'Priority Support', included: true },
      { name: 'Audit Logs', included: true },
      { name: 'Custom Roles', included: true },
      { name: 'SSO / SAML', included: true },
      { name: 'Bulk Operations', included: true },
      { name: 'Export Data', included: true },
      { name: 'Dedicated Support', included: true },
      { name: 'Custom SLA', included: true },
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

