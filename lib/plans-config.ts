/**
 * Plans Configuration
 * 
 * Defines all subscription plans with Stripe price IDs and features
 * Used by pricing page, checkout flow, and subscription management
 */

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

/**
 * All available plans
 * Unlimited is represented as -1
 */
export const PLANS_CONFIG: Plan[] = [
  {
    id: 'free',
    code: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    monthly: {
      amount: 0,
      priceId: 'price_1SL5MCA8kaNOs7rye16c39RS',
      interval: 'month',
    },
    features: [
      { name: '1 Environment', included: true },
      { name: '3 DNS Zones', included: true },
      { name: '100 DNS Records per Zone', included: true },
      { name: '2 Team Members', included: true },
      { name: 'Community Support', included: true },
      { name: 'API Access', included: false },
      { name: 'Advanced Analytics', included: false },
      { name: 'Priority Support', included: false },
    ],
    limits: {
      environments: 1,
      zones: 3,
      dnsRecords: 100,
      teamMembers: 2,
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
    id: 'basic',
    code: 'basic_monthly',
    name: 'Basic',
    description: 'Great for small teams',
    monthly: {
      amount: 3.50,
      priceId: 'price_1SL5NJA8kaNOs7rywCjYzPgH',
      interval: 'month',
    },
    annual: {
      amount: 42.00,
      priceId: 'price_1SLSWiA8kaNOs7ryllPfcTHx',
      interval: 'year',
    },
    features: [
      { name: '3 Environments', included: true },
      { name: '10 DNS Zones', included: true },
      { name: '500 DNS Records per Zone', included: true },
      { name: '5 Team Members', included: true },
      { name: 'Bulk Operations', included: true },
      { name: 'Export Data', included: true },
      { name: 'Email Support', included: true },
      { name: 'API Access', included: false },
      { name: 'Advanced Analytics', included: false },
    ],
    limits: {
      environments: 3,
      zones: 10,
      dnsRecords: 500,
      teamMembers: 5,
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
    id: 'pro',
    code: 'pro_monthly',
    name: 'Pro',
    description: 'For growing businesses',
    popular: true,
    monthly: {
      amount: 6.70,
      priceId: 'price_1SLSXKA8kaNOs7ryKJ6hCHd5',
      interval: 'month',
    },
    annual: {
      amount: 80.40,
      priceId: 'price_1SLSYMA8kaNOs7ryrJU9oOYL',
      interval: 'year',
    },
    features: [
      { name: '10 Environments', included: true },
      { name: '50 DNS Zones', included: true },
      { name: '5,000 DNS Records per Zone', included: true },
      { name: '10 Team Members', included: true },
      { name: 'API Access', included: true },
      { name: 'Advanced Analytics', included: true },
      { name: 'Priority Support', included: true },
      { name: 'Audit Logs', included: true },
      { name: 'Bulk Operations', included: true },
      { name: 'Export Data', included: true },
    ],
    limits: {
      environments: 10,
      zones: 50,
      dnsRecords: 5000,
      teamMembers: 10,
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
    id: 'enterprise',
    code: 'enterprise_monthly',
    name: 'Enterprise',
    description: 'For large organizations',
    monthly: {
      amount: 450,
      priceId: 'price_1SLSZFA8kaNOs7rywWLjhQ8b',
      interval: 'month',
    },
    features: [
      { name: 'Unlimited Environments', included: true },
      { name: 'Unlimited DNS Zones', included: true },
      { name: 'Unlimited DNS Records', included: true },
      { name: 'Unlimited Team Members', included: true },
      { name: 'Custom Roles', included: true },
      { name: 'SSO / SAML', included: true },
      { name: 'Dedicated Support', included: true },
      { name: 'SLA Guarantee', included: true },
      { name: 'Custom Integrations', included: true },
      { name: 'White-label Options', included: true },
    ],
    limits: {
      environments: -1, // Unlimited
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
 * Get plan by ID
 */
export function getPlanById(id: string): Plan | undefined {
  return PLANS_CONFIG.find((p) => p.id === id);
}

/**
 * Get plan by code
 */
export function getPlanByCode(code: string): Plan | undefined {
  return PLANS_CONFIG.find((p) => p.code === code);
}

/**
 * Get price ID for a plan and interval
 */
export function getPriceId(planId: string, interval: 'month' | 'year'): string | null {
  const plan = getPlanById(planId);
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
 * Format price for display
 */
export function formatPrice(amount: number, interval?: 'month' | 'year'): string {
  if (amount === 0) return 'Free';
  const formatted = amount.toFixed(2);
  return interval ? `$${formatted}/${interval}` : `$${formatted}`;
}

/**
 * Calculate annual savings
 */
export function calculateAnnualSavings(plan: Plan): number {
  if (!plan.monthly || !plan.annual) return 0;
  const monthlyTotal = plan.monthly.amount * 12;
  const annualTotal = plan.annual.amount;
  return monthlyTotal - annualTotal;
}

/**
 * Check if plan has a specific feature
 */
export function planHasFeature(
  planId: string,
  feature: keyof Plan['booleanFeatures']
): boolean {
  const plan = getPlanById(planId);
  return plan?.booleanFeatures[feature] ?? false;
}

/**
 * Get plan limit for a resource
 */
export function getPlanLimit(
  planId: string,
  resource: keyof Plan['limits']
): number {
  const plan = getPlanById(planId);
  return plan?.limits[resource] ?? 0;
}

