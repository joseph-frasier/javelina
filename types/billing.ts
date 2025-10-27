/**
 * Billing Types - Organization-Based Subscriptions
 * 
 * These types mirror the Supabase billing schema v2
 */

// =====================================================
// PLANS
// =====================================================

export interface Plan {
  id: string;
  code: 'free' | 'basic_monthly' | 'basic_annual' | 'pro_monthly' | 'pro_annual' | 'enterprise_monthly' | string;
  name: string;
  stripe_product_id: string | null;
  billing_interval: 'month' | 'year' | null;
  metadata: {
    description?: string;
    price?: number;
    price_id?: string;
    annual_price?: number;
    monthly_equivalent?: number;
    savings?: string;
    recommended_for?: string;
    contact_sales?: boolean;
    [key: string]: any;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PlanCode = 'free' | 'basic_monthly' | 'basic_annual' | 'pro_monthly' | 'pro_annual' | 'enterprise_monthly';

// =====================================================
// ENTITLEMENTS
// =====================================================

export interface Entitlement {
  id: string;
  key: string;
  description: string | null;
  value_type: 'boolean' | 'numeric' | 'text';
  created_at: string;
}

export type EntitlementKey = 
  | 'environments_limit'
  | 'zones_limit'
  | 'dns_records_limit'
  | 'team_members_limit'
  | 'api_access'
  | 'advanced_analytics'
  | 'priority_support'
  | 'audit_logs'
  | 'custom_roles'
  | 'sso_enabled'
  | 'bulk_operations'
  | 'export_data';

// =====================================================
// PLAN ENTITLEMENTS
// =====================================================

export interface PlanEntitlement {
  plan_id: string;
  entitlement_id: string;
  value: string; // Store as string, parse based on entitlement.value_type
}

// =====================================================
// SUBSCRIPTIONS
// =====================================================

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export interface Subscription {
  id: string;
  org_id: string;
  stripe_subscription_id: string | null;
  plan_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  cancel_at: string | null;
  cancel_at_period_end: boolean;
  created_by: string | null;
  metadata: {
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

// =====================================================
// SUBSCRIPTION ITEMS
// =====================================================

export interface SubscriptionItem {
  id: string;
  subscription_id: string;
  stripe_price_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

// =====================================================
// ORG ENTITLEMENT OVERRIDES
// =====================================================

export interface OrgEntitlementOverride {
  org_id: string;
  entitlement_id: string;
  value: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// HELPER FUNCTION RETURN TYPES
// =====================================================

/**
 * Return type for get_org_subscription() function
 */
export interface OrgSubscriptionDetails {
  subscription_id: string;
  stripe_subscription_id: string | null;
  plan_code: string | null;
  plan_name: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
}

/**
 * Return type for get_org_entitlements() function
 */
export interface OrgEntitlement {
  entitlement_key: string;
  entitlement_description: string | null;
  value: string;
  value_type: 'boolean' | 'numeric' | 'text';
  is_override: boolean;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

/**
 * Response from /api/subscriptions/current
 */
export interface CurrentSubscriptionResponse {
  subscription: OrgSubscriptionDetails | null;
  plan: Plan | null;
  entitlements: OrgEntitlement[];
}

/**
 * Response from /api/entitlements/check
 */
export interface EntitlementCheckResponse {
  org_id: string;
  entitlement_key: string;
  value: string | null;
  value_type: 'boolean' | 'numeric' | 'text' | null;
  parsed_value: boolean | number | string | null;
}

/**
 * Response from /api/subscriptions/can-create
 */
export interface CanCreateResourceResponse {
  org_id: string;
  resource_type: 'environment' | 'zone' | 'member';
  can_create: boolean;
  current_count?: number;
  limit?: number | null; // null means no limit defined, -1 means unlimited
  reason?: string;
}

// =====================================================
// STRIPE TYPES
// =====================================================

/**
 * Metadata included in Stripe Checkout Sessions
 */
export interface StripeCheckoutMetadata {
  org_id: string;
  user_id: string;
  plan_code: string;
}

/**
 * Data for creating a checkout session
 */
export interface CreateCheckoutSessionRequest {
  org_id: string;
  price_id: string;
  success_url?: string;
  cancel_url?: string;
}

/**
 * Response from /api/stripe/create-checkout-session
 */
export interface CreateCheckoutSessionResponse {
  session_id: string;
  url: string;
}

/**
 * Response from /api/stripe/create-portal-session
 */
export interface CreatePortalSessionResponse {
  url: string;
}

// =====================================================
// USAGE TRACKING TYPES
// =====================================================

/**
 * Current resource usage for an organization
 */
export interface OrgUsage {
  org_id: string;
  environments_count: number;
  zones_count: number;
  members_count: number;
  dns_records_count?: number;
}

/**
 * Usage with limits for display
 */
export interface OrgUsageWithLimits extends OrgUsage {
  environments_limit: number | null; // -1 = unlimited
  zones_limit: number | null;
  members_limit: number | null;
  dns_records_limit: number | null;
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Parse entitlement value based on type
 */
export function parseEntitlementValue(
  value: string,
  valueType: 'boolean' | 'numeric' | 'text'
): boolean | number | string {
  switch (valueType) {
    case 'boolean':
      return value === 'true';
    case 'numeric':
      return parseInt(value, 10);
    case 'text':
    default:
      return value;
  }
}

/**
 * Check if a numeric limit is unlimited
 */
export function isUnlimited(limit: number | string | null): boolean {
  if (limit === null) return false;
  const numericLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;
  return numericLimit === -1;
}

/**
 * Format limit for display
 */
export function formatLimit(limit: number | string | null): string {
  if (limit === null) return 'Not set';
  const numericLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;
  if (numericLimit === -1) return 'Unlimited';
  return numericLimit.toLocaleString();
}

