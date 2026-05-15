/**
 * Centralized API Client for Express Backend
 * 
 * This client handles all communication with the Express API backend,
 * automatically attaching JWT tokens from Supabase auth and handling errors.
 * 
 * Admin requests include an Authorization header with the admin JWT so that
 * cross-domain calls to the Express backend work in production.
 */

import { getIdleSync } from '@/lib/idle/idleSync';

// Error class for API errors
export class ApiError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Generic API request function
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Route through same-origin proxy to avoid Safari ITP third-party cookie blocking.
    // Next.js rewrites in next.config.ts forward /api/backend/* to the Express backend.
    const url = `/api/backend${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Parse response
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Handle errors
    if (!response.ok) {
      // Session expired due to inactivity -- trigger clean logout identical to
      // the frontend idle timer. This catches edge cases where the backend's
      // safety-net timeout fires before the frontend timer (e.g., laptop
      // sleep/wake, background tab throttling).
      if (response.status === 401 && data?.reason === 'inactivity') {
        try {
          const sync = getIdleSync();
          sync.publishLogout();
          localStorage.removeItem('javelina-last-activity');
        } catch (e) { /* ignore broadcast errors */ }
        window.location.href = '/api/logout';
        throw new ApiError('Session expired due to inactivity', 401, data);
      }

      // Special handling for disabled organization errors
      if (response.status === 403 && data?.error === 'Organization is disabled') {
        const errorMessage = data?.message || 'This organization is currently disabled. Contact support for assistance.';
        throw new ApiError(errorMessage, response.status, data);
      }
      
      // Special handling for email verification errors
      if (response.status === 403 && data?.code === 'EMAIL_NOT_VERIFIED') {
        const errorMessage = data?.message || 'Please verify your email to continue';
        const error = new ApiError(errorMessage, response.status, data);
        // Add code to error details for frontend handling
        (error as any).code = 'EMAIL_NOT_VERIFIED';
        throw error;
      }
      
      const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, data);
    }

    // Return data (unwrap success wrapper if present)
    return data?.data !== undefined ? data.data : data;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Wrap other errors
    console.error('API request error:', error);
    throw new ApiError(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    );
  }
}

// =====================================================
// CONVENIENCE METHODS
// =====================================================

export const apiClient = {
  /**
   * GET request
   */
  get: <T = any>(endpoint: string, options?: RequestInit): Promise<T> => {
    return apiRequest<T>(endpoint, { ...options, method: 'GET' });
  },

  /**
   * POST request
   */
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> => {
    return apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PUT request
   */
  put: <T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> => {
    return apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PATCH request
   */
  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> => {
    return apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * DELETE request
   */
  delete: <T = any>(endpoint: string, options?: RequestInit): Promise<T> => {
    return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
  },
};

// =====================================================
// DOMAIN-SPECIFIC API METHODS
// =====================================================

// Proration payment response types
interface ProrationPayment {
  payment_intent_id?: string;
  amount: number;
  status: 'succeeded' | 'failed';
  error?: string;
}

interface UpdateSubscriptionResponse {
  success: boolean;
  subscription_id: string;
  proration?: {
    current_plan_credit: number;
    new_plan_charge: number;
    amount_due: number;
    payment: ProrationPayment | null;
  };
  message?: string;
}

// Stripe API
export const stripeApi = {
  /**
   * Create a subscription intent
   * @param org_id - Organization ID
   * @param plan_code - Plan code to subscribe to
   * @param price_id - Optional Stripe price ID
   * @param promotion_code - Optional promotion code to apply discount
   */
  createSubscription: (org_id: string, plan_code: string, price_id?: string, promotion_code?: string) => {
    return apiClient.post('/stripe/subscriptions', { org_id, plan_code, price_id, promotion_code });
  },

  /**
   * Create a billing portal session
   */
  createPortalSession: (org_id: string) => {
    return apiClient.post('/stripe/portal-session', { org_id });
  },

  /**
   * Update a subscription
   * Returns proration details including payment status if applicable
   */
  updateSubscription: (org_id: string, new_plan_code: string): Promise<UpdateSubscriptionResponse> => {
    return apiClient.post<UpdateSubscriptionResponse>('/stripe/subscriptions/update', { org_id, new_plan_code });
  },
  
  /**
   * Calculate upgrade pricing with proration
   */
  calculateUpgrade: (org_id: string, target_plan_code: string) => {
    return apiClient.post('/stripe/calculate-upgrade', { org_id, target_plan_code });
  },
  
  /**
   * Upgrade to lifetime plan or higher lifetime tier
   * Returns a clientSecret for the PaymentIntent to be used with Stripe Elements
   */
  upgradeToLifetime: (org_id: string, target_plan_code: string): Promise<{
    clientSecret: string;
    flow: 'payment_intent';
    upgrade_type: 'subscription-to-lifetime' | 'lifetime-to-lifetime';
    final_price: number;
  }> => {
    return apiClient.post('/stripe/upgrade-to-lifetime', { org_id, target_plan_code });
  },
};

// Subscriptions API
export const subscriptionsApi = {
  /**
   * Get current subscription for an organization
   */
  getCurrent: (org_id: string) => {
    return apiClient.get(`/subscriptions/current?org_id=${org_id}`);
  },

  /**
   * Get subscription status
   */
  getStatus: (org_id: string) => {
    return apiClient.get(`/subscriptions/status?org_id=${org_id}`);
  },

  /**
   * Get all user's organizations with subscription data
   * (Used by settings page to show billing for all orgs user has admin access to)
   */
  getAllWithSubscriptions: () => {
    return apiClient.get('/subscriptions/all');
  },

  /**
   * Get plan name and code for an organization (accessible to all members)
   */
  getOrgPlan: (org_id: string) => {
    return apiClient.get(`/subscriptions/plan?org_id=${org_id}`);
  },
};


// Plans API
export const plansApi = {
  /**
   * Get all active plans with entitlements
   */
  getAll: () => {
    return apiClient.get('/plans');
  },

  /**
   * Get a specific plan by code
   */
  getByCode: (code: string) => {
    return apiClient.get(`/plans/${code}`);
  },
};

export interface Invitation {
  id: string;
  email: string;
  role: 'Admin' | 'Editor' | 'BillingContact' | 'Viewer';
  status: 'pending' | 'awaiting_verification';
  invited_by_name?: string;
  invited_by_email?: string;
  created_at: string;
  expires_at?: string;
}

// Organizations API
export const organizationsApi = {
  /**
   * List all organizations for current user
   */
  list: () => {
    return apiClient.get('/organizations');
  },

  /**
   * Get organization by ID
   */
  get: (id: string) => {
    return apiClient.get(`/organizations/${id}`);
  },

  /**
   * Get the bundled-domain entitlement status for an org.
   * Returns { eligible, redeemed, redeemed_at, available } where `available`
   * means the org's plan includes a bundled domain AND it hasn't been used yet.
   */
  getBundledDomainStatus: (id: string): Promise<{
    eligible: boolean;
    redeemed: boolean;
    redeemed_at: string | null;
    available: boolean;
  }> => {
    return apiClient.get(`/organizations/${id}/bundled-domain-status`);
  },

  /**
   * Create a new organization
   */
  create: (data: { 
    name: string; 
    description?: string;
    billing_phone?: string;
    billing_email?: string;
    billing_address?: string;
    billing_city?: string;
    billing_state?: string;
    billing_zip?: string;
    admin_contact_email?: string;
    admin_contact_phone?: string;
    pending_plan_code?: string;
    pending_price_id?: string;
  }) => {
    return apiClient.post('/organizations', data);
  },

  /**
   * Update an organization
   */
  update: (id: string, data: { 
    name?: string; 
    description?: string;
    billing_phone?: string;
    billing_email?: string;
    billing_address?: string;
    billing_city?: string;
    billing_state?: string;
    billing_zip?: string;
    admin_contact_email?: string;
    admin_contact_phone?: string;
  }) => {
    return apiClient.put(`/organizations/${id}`, data);
  },

  /**
   * Delete an organization
   */
  delete: (id: string) => {
    return apiClient.delete(`/organizations/${id}`);
  },

  /**
   * Get organization members
   */
  getMembers: (id: string) => {
    return apiClient.get(`/organizations/${id}/members`);
  },

  /**
   * Send a team invitation for an organization member
   */
  addMember: (
    id: string,
    data: { email: string; role: 'Admin' | 'Editor' | 'BillingContact' | 'Viewer' }
  ): Promise<{
    success: boolean;
    invitation_id?: string;
    status?: 'pending' | 'awaiting_verification' | 'accepted' | 'expired' | 'revoked' | 'failed';
    email?: string;
    message?: string;
  }> => {
    return apiClient.post(`/organizations/${id}/members`, data);
  },

  /**
   * Get pending invitations for an organization
   */
  getInvitations: (id: string): Promise<Invitation[]> => {
    return apiClient.get(`/organizations/${id}/invitations`);
  },

  /**
   * Revoke a pending invitation
   */
  revokeInvitation: (id: string, invitationId: string): Promise<{ success: boolean }> => {
    return apiClient.post(`/organizations/${id}/invitations/${invitationId}/revoke`);
  },

  /**
   * Update a member's role in an organization
   */
  updateMemberRole: (id: string, userId: string, role: 'Admin' | 'Editor' | 'BillingContact' | 'Viewer') => {
    return apiClient.put(`/organizations/${id}/members/${userId}/role`, { role });
  },

  /**
   * Remove a member from an organization
   */
  removeMember: (id: string, userId: string) => {
    return apiClient.delete(`/organizations/${id}/members/${userId}`);
  },

  /**
   * Get audit logs for an organization
   */
  auditLogs: (id: string, limit: number = 10) => {
    return apiClient.get(`/organizations/${id}/audit-logs?limit=${limit}`);
  },

  /**
   * Get activity logs for an organization
   */
  activityLogs: (id: string, limit: number = 10) => {
    return apiClient.get(`/organizations/${id}/activity?limit=${limit}`);
  },
};

// Zones API
export const zonesApi = {
  /**
   * List all zones
   */
  list: () => {
    return apiClient.get('/zones');
  },

  /**
   * List zones for an organization
   */
  listByOrganization: (orgId: string) => {
    return apiClient.get(`/zones/organization/${orgId}`);
  },

  /**
   * Get zone by ID
   */
  get: (id: string) => {
    return apiClient.get(`/zones/${id}`);
  },

  /**
   * Create a new zone
   */
  create: (data: { name: string; organization_id: string; description?: string; admin_email?: string; negative_caching_ttl?: number }) => {
    return apiClient.post('/zones', data);
  },

  /**
   * Update a zone
   */
  update: (id: string, data: { name?: string; description?: string; admin_email?: string; negative_caching_ttl?: number }) => {
    return apiClient.put(`/zones/${id}`, data);
  },

  /**
   * Delete a zone
   */
  delete: (id: string) => {
    return apiClient.delete(`/zones/${id}`);
  },

  /**
   * Get audit logs for a zone
   */
  auditLogs: (id: string) => {
    return apiClient.get(`/zones/${id}/audit-logs`);
  },
};

// DNS Records API
export const dnsRecordsApi = {
  /**
   * List DNS records for a zone
   */
  list: (zoneId: string) => {
    return apiClient.get(`/dns-records/zone/${zoneId}`);
  },

  /**
   * Get DNS record by ID
   */
  get: (id: string) => {
    return apiClient.get(`/dns-records/${id}`);
  },

  /**
   * Create a DNS record
   */
  create: (data: any) => {
    return apiClient.post('/dns-records', data);
  },

  /**
   * Update a DNS record
   */
  update: (id: string, data: any) => {
    return apiClient.put(`/dns-records/${id}`, data);
  },

  /**
   * Delete a DNS record
   */
  delete: (id: string) => {
    return apiClient.delete(`/dns-records/${id}`);
  },
};

// ===== Intake (admin pipelines queue) =====
// Backend forwarder is a pure passthrough — responses are byte-identical to
// what javelina-intake's /api/internal/leads* returns. See
// documentation/admin-queue-api-guide.md.

export type LeadStatus =
  | 'created' | 'form_submitted' | 'agents_complete'
  | 'scope_confirmed' | 'provisioning' | 'live'
  | 'routed_to_custom' | 'abandoned' | 'failed';

export type LeadPackage = 'business_starter' | 'business_pro';

export interface LeadSummary {
  id: string;
  firm_id: string;
  org_id: string;
  package: LeadPackage;
  contact_email: string;
  contact_name: string;
  status: LeadStatus;
  version: number;
  total_cost_cents: number;
  created_at: string;
  form_submitted_at: string | null;
  agents_completed_at: string | null;
  scope_confirmed_at: string | null;
  scope_rejected_at: string | null;
  scope_rejection_reason: string | null;
  updated_at: string;
}

export interface ListLeadsResponse {
  leads: LeadSummary[];
  pagination: { limit: number; offset: number; total: number | null };
}

export interface LeadDetail extends LeadSummary {
  lead_record: LeadRecord | null;
  research_report: ResearchReport | null;
  similarity_report: SimilarityReport | null;
  upsell_risk_report: UpsellRiskReport | null;
  // Agent 10 (Composer) emits both copy + page structure here. The legacy
  // structure_prep column on the intake DB is unused (Agent 11 was folded
  // into Agent 10) — see documentation/admin-queue-api-guide.md §3.
  copy_prep: ContentPlanReport | null;
  design_prep: DesignDirectionReport | null;
}

export interface LeadService {
  lead_id: string;
  service: 'website' | 'dns' | 'email' | 'domain';
  state: string;
  internal_state: string;
  progress_label: string;
  metadata: Record<string, unknown>;
  updated_at: string;
}

export interface LeadDetailResponse {
  lead: LeadDetail;
  services: LeadService[];
}

export type ActionResponse =
  | { result: 'applied' | 'already_applied'; status: LeadStatus; [k: string]: unknown }
  | { error: string; from?: LeadStatus; to?: LeadStatus };

export interface ListLeadsParams {
  status?: LeadStatus;
  package?: LeadPackage;
  age_min_hours?: number;
  limit?: number;
  offset?: number;
  order?: 'oldest' | 'newest';
}

function buildIntakeQueryString(params?: ListLeadsParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.package) qs.set('package', params.package);
  if (typeof params.age_min_hours === 'number') {
    qs.set('age_min_hours', String(params.age_min_hours));
  }
  if (typeof params.limit === 'number') qs.set('limit', String(params.limit));
  if (typeof params.offset === 'number') qs.set('offset', String(params.offset));
  if (params.order) qs.set('order', params.order);
  return qs.toString();
}

// Admin API
export const adminApi = {
  /**
   * Get admin dashboard data
   */
  getDashboard: () => {
    return apiClient.get('/admin/dashboard');
  },

  /**
   * Get system stats
   */
  getStats: () => {
    return apiClient.get('/admin/stats');
  },

  /**
   * List all users (admin only)
   */
  listUsers: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    const queryString = query.toString();
    return apiClient.get(`/admin/users${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get user details (admin only)
   */
  getUser: (userId: string) => {
    return apiClient.get(`/admin/users/${userId}`);
  },

  /**
   * Disable a user
   */
  disableUser: (userId: string) => {
    return apiClient.put(`/admin/users/${userId}/disable`);
  },

  /**
   * Enable a user
   */
  enableUser: (userId: string) => {
    return apiClient.put(`/admin/users/${userId}/enable`);
  },

  /**
   * Update user role
   */
  updateUserRole: (userId: string, role: string) => {
    return apiClient.put(`/admin/users/${userId}/role`, { role });
  },

  /**
   * Send password reset email via Auth0 Management API
   */
  sendPasswordReset: (email: string) => {
    return apiClient.post('/admin/users/password-reset', { email });
  },

  /**
   * List all organizations (admin only)
   */
  listOrganizations: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    const queryString = query.toString();
    return apiClient.get(`/admin/organizations${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Create an organization
   */
  createOrganization: (data: { name: string; description?: string }) => {
    return apiClient.post('/admin/organizations', data);
  },

  /**
   * Soft delete an organization
   */
  softDeleteOrganization: (orgId: string) => {
    return apiClient.put(`/admin/organizations/${orgId}/soft-delete`);
  },

  /**
   * Get single organization with full details (admin only)
   */
  getOrganization: (orgId: string) => {
    return apiClient.get(`/admin/organizations/${orgId}`);
  },

  /**
   * Get organization members (admin only)
   */
  getOrganizationMembers: (orgId: string) => {
    return apiClient.get(`/admin/organizations/${orgId}/members`);
  },

  /**
   * Disable organization (admin only)
   */
  disableOrganization: (orgId: string) => {
    return apiClient.put(`/admin/organizations/${orgId}/disable`);
  },

  /**
   * Enable organization (admin only)
   */
  enableOrganization: (orgId: string) => {
    return apiClient.put(`/admin/organizations/${orgId}/enable`);
  },

  /**
   * Get all audit logs (admin only)
   */
  getAuditLogs: (params?: { page?: number; limit?: number; table_name?: string; action?: string; actor_type?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.table_name) query.append('table_name', params.table_name);
    if (params?.action) query.append('action', params.action);
    if (params?.actor_type) query.append('actor_type', params.actor_type);
    const queryString = query.toString();
    return apiClient.get(`/admin/audit-logs${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * List all domains across all users (admin only)
   */
  listDomains: () => {
    return apiClient.get('/admin/domains');
  },

  /**
   * List all TLD pricing (admin only)
   */
  listTldPricing: () => {
    return apiClient.get('/admin/tld-pricing');
  },

  /**
   * Get global TLD margin
   */
  getGlobalMargin: () => {
    return apiClient.get('/admin/tld-pricing/global-margin');
  },

  /**
   * Update global TLD margin
   */
  updateGlobalMargin: (margin: number) => {
    return apiClient.put('/admin/tld-pricing/global-margin', { margin });
  },

  /**
   * Update a single TLD's pricing
   */
  updateTldPricing: (tld: string, updates: {
    margin_override?: number | null;
    sale_registration?: number | null;
    sale_renewal?: number | null;
    sale_transfer?: number | null;
    is_active?: boolean;
  }) => {
    return apiClient.put(`/admin/tld-pricing/${encodeURIComponent(tld)}`, updates);
  },

  /**
   * Seed TLD pricing from OpenSRS wholesale prices
   */
  seedTldPricing: () => {
    return apiClient.post('/admin/tld-pricing/seed', undefined, {
      signal: AbortSignal.timeout(120000), // 2 min timeout for seeding 87 TLDs
    });
  },

  // Flagged zone management
  getFlaggedZones: () => {
    return apiClient.get('/admin/zones/flagged');
  },
  approveFlaggedZone: (zoneId: string) => {
    return apiClient.put(`/admin/zones/${zoneId}/approve`);
  },
  renameFlaggedZone: (zoneId: string, name: string) => {
    return apiClient.put(`/admin/zones/${zoneId}/rename`, { name });
  },
  deleteFlaggedZone: (zoneId: string) => {
    return apiClient.delete(`/admin/zones/${zoneId}`);
  },

  // Mailbox Pricing
  listMailboxPricing: () => {
    return apiClient.get('/admin/mailbox-pricing');
  },

  updateMailboxPricing: (tierId: string, updates: {
    margin_percent?: number;
    sale_price_override?: number | null;
    mailbox_limit?: number;
    is_active?: boolean;
  }) => {
    return apiClient.put(`/admin/mailbox-pricing/${tierId}`, updates);
  },

  intake: {
    listLeads: (params?: ListLeadsParams) => {
      const qs = buildIntakeQueryString(params);
      return apiClient.get<ListLeadsResponse>(
        `/admin/intake/leads${qs ? `?${qs}` : ''}`
      );
    },

    getLead: (leadId: string) =>
      apiClient.get<LeadDetailResponse>(`/admin/intake/leads/${leadId}`),

    confirmScope: (leadId: string) =>
      apiClient.post<ActionResponse>(
        `/admin/intake/leads/${leadId}/confirm-scope`,
        {}
      ),

    reject: (leadId: string, reason: string) =>
      apiClient.post<ActionResponse>(
        `/admin/intake/leads/${leadId}/reject`,
        { reason }
      ),

    markFailed: (leadId: string, reason: string) =>
      apiClient.post<ActionResponse>(
        `/admin/intake/leads/${leadId}/mark-failed`,
        { reason }
      ),

    retryAgent1: (leadId: string) =>
      apiClient.post<ActionResponse>(
        `/admin/intake/leads/${leadId}/retry-agent-1`,
        {}
      ),
    // mark-pax8-done deferred to JAV-119 1.6

    overrideService: (
      leadId: string,
      service: 'website' | 'dns' | 'email' | 'domain',
      body: {
        state: 'live' | 'not_applicable' | 'failed' | 'needs_input';
        reason: string;
        progress_label?: string;
      }
    ) =>
      apiClient.post<{
        status: 'applied';
        lead_id: string;
        service: string;
        state: string;
        progress_label: string | null;
        override_id: string;
      }>(`/admin/intake/leads/${leadId}/services/${service}/override`, body),
  },
};

// Discounts/Promotion Codes API
export const discountsApi = {
  /**
   * Validate a promotion code
   * Returns discount details if valid, error if invalid
   */
  validate: (code: string, plan_code?: string): Promise<{
    valid: boolean;
    promotion_code_id?: string;
    stripe_promotion_code_id?: string;
    discount_type?: 'percent_off' | 'amount_off';
    discount_value?: number;
    code?: string;
    message?: string;
  }> => {
    return apiClient.post('/discounts/validate', { code, plan_code });
  },

  /**
   * List all promotion codes (admin only)
   */
  list: (params?: { active_only?: boolean; page?: number; limit?: number }): Promise<{
    promotion_codes: PromotionCode[];
    total: number;
    page: number;
    limit: number;
  }> => {
    const query = new URLSearchParams();
    if (params?.active_only !== undefined) query.append('active_only', params.active_only.toString());
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const queryString = query.toString();
    return apiClient.get(`/discounts${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Create a new promotion code (admin only)
   */
  create: (data: {
    code: string;
    discount_type: 'percent_off' | 'amount_off';
    discount_value: number;
    max_redemptions?: number;
    expires_at?: string;
    first_time_transaction_only?: boolean;
  }): Promise<PromotionCode> => {
    return apiClient.post('/discounts', data);
  },

  /**
   * Deactivate a promotion code (admin only)
   */
  deactivate: (id: string): Promise<{ success: boolean }> => {
    return apiClient.delete(`/discounts/${id}`);
  },

  /**
   * Get promotion code redemption history (admin only)
   */
  getRedemptions: (params?: { promotion_code_id?: string; page?: number; limit?: number }): Promise<{
    redemptions: DiscountRedemption[];
    total: number;
    page: number;
    limit: number;
  }> => {
    const query = new URLSearchParams();
    if (params?.promotion_code_id) query.append('promotion_code_id', params.promotion_code_id);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const queryString = query.toString();
    return apiClient.get(`/discounts/redemptions${queryString ? `?${queryString}` : ''}`);
  },
};

// Types for discount API
export interface PromotionCode {
  id: string;
  stripe_promotion_code_id: string;
  stripe_coupon_id: string;
  code: string;
  discount_type: 'percent_off' | 'amount_off';
  discount_value: number;
  currency: string;
  max_redemptions: number | null;
  times_redeemed: number;
  first_time_transaction_only: boolean;
  applies_to_plans: string[] | null;
  expires_at: string | null;
  is_active: boolean;
  metadata: Record<string, any>;
  created_by: string | null;
  creator_name: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscountRedemption {
  id: string;
  promotion_code_id: string;
  org_id: string;
  subscription_id: string | null;
  user_id: string | null;
  stripe_invoice_id: string | null;
  amount_discounted: number;
  original_amount: number;
  final_amount: number;
  created_at: string;
  // Joined fields
  promotion_code?: PromotionCode;
  organization_name?: string;
}

// Auth API
export const authApi = {
  /**
   * Resend email verification email
   */
  resendVerification: (): Promise<{
    success: boolean;
    message: string;
  }> => {
    return apiClient.post('/auth/resend-verification');
  },

  /**
   * Get current user's email verification status
   */
  getVerificationStatus: (): Promise<{
    email_verified: boolean;
    email: string;
  }> => {
    return apiClient.get('/auth/me/verification-status');
  },

  /**
   * Refresh email verification status from Auth0 and sync to session/database
   * Call this after user clicks verification link to ensure session is updated
   */
  refreshVerificationStatus: (): Promise<{
    success: boolean;
    email_verified: boolean;
    message: string;
  }> => {
    return apiClient.post('/auth/refresh-verification-status');
  },

  /**
   * Finalize any pending organization invitation after verification/login
   */
  finalizeInvitation: (): Promise<{
    success: boolean;
    message?: string;
    code?: string;
    organization_id?: string;
  }> => {
    return apiClient.post('/auth/finalize-invitation');
  },
};

// Tags API
export const tagsApi = {
  /**
   * List all tags for an organization
   */
  list: (org_id: string): Promise<{
    tags: Tag[];
    assignments: ZoneTagAssignment[];
  }> => {
    return apiClient.get(`/tags?org_id=${org_id}`);
  },

  /**
   * Create a new tag
   */
  create: (data: {
    organization_id: string;
    name: string;
    color: string;
  }): Promise<Tag> => {
    return apiClient.post('/tags', data);
  },

  /**
   * Update a tag
   */
  update: (id: string, data: {
    name?: string;
    color?: string;
    is_favorite?: boolean;
    display_order?: number;
  }): Promise<Tag> => {
    return apiClient.put(`/tags/${id}`, data);
  },

  /**
   * Delete a tag
   */
  delete: (id: string): Promise<{
    success: boolean;
    message: string;
    zone_assignments_removed: number;
  }> => {
    return apiClient.delete(`/tags/${id}`);
  },

  /**
   * Get tags assigned to a zone
   */
  getZoneTags: (zoneId: string): Promise<Tag[]> => {
    return apiClient.get(`/tags/zones/${zoneId}`);
  },

  /**
   * Update tag assignments for a zone
   */
  updateZoneTags: (zoneId: string, tag_ids: string[]): Promise<{
    zone_id: string;
    tag_ids: string[];
  }> => {
    return apiClient.put(`/tags/zones/${zoneId}`, { tag_ids });
  },
};

// Types for tags API
export interface Tag {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  is_favorite: boolean;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  zone_count?: number;
}

export interface ZoneTagAssignment {
  zone_id: string;
  tag_ids: string[];
}

// Support API (AI KB Assistant)
export const supportApi = {
  /**
   * Send a chat message to the support assistant
   */
  chat: (data: {
    message: string;
    conversationId?: string;
    entryPoint?: string;
    pageUrl?: string;
    userId: string;
    orgId?: string;
    tier?: string;
    attemptCount?: number;
    snapshot?: any;
  }): Promise<SupportChatResponse> => {
    return apiClient.post('/support/chat', data);
  },

  /**
   * Stream a chat response via SSE (fetch-based).
   * Returns a ReadableStream of SSE events.
   */
  chatStream: async (
    data: {
      message: string;
      conversationId?: string;
      entryPoint?: string;
      pageUrl?: string;
      userId: string;
      orgId?: string;
      tier?: string;
      attemptCount?: number;
      snapshot?: any;
    },
    onDelta: (text: string) => void,
    onMetadata: (metadata: { intent: string; confidence: number; citations: SupportCitation[]; nextAction: string }) => void,
    onDone: (info: { conversationId: string; responseTimeMs: number }) => void,
    onError: (error: { message: string }) => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Use dedicated streaming proxy so response is streamed (rewrite can buffer).
    const url = '/api/support/chat/stream';
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      credentials: 'include',
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let msg = `Request failed with status ${response.status}`;
      try { msg = JSON.parse(errorBody)?.error || msg; } catch {}
      throw new ApiError(msg, response.status);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new ApiError('No response body', 500);

    const decoder = new TextDecoder();
    let partial = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      partial += decoder.decode(value, { stream: true });
      const lines = partial.split('\n');
      partial = lines.pop() || '';

      let currentEvent = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const payload = line.slice(6);
          try {
            const parsed = JSON.parse(payload);
            switch (currentEvent) {
              case 'delta':
                onDelta(parsed.text);
                break;
              case 'metadata':
                onMetadata(parsed);
                break;
              case 'done':
                onDone(parsed);
                break;
              case 'error':
                onError(parsed);
                break;
            }
          } catch {}
          currentEvent = '';
        }
      }
    }
  },

  /**
   * Submit feedback for a support conversation
   */
  submitFeedback: (data: {
    conversationId: string;
    resolved: boolean;
    rating?: number;
    comment?: string;
    userId: string;
    orgId?: string;
    tier?: string;
  }): Promise<{ success: boolean }> => {
    return apiClient.post('/support/feedback', data);
  },

  /**
   * Log a bug (escalation path)
   */
  logBug: (data: {
    subject: string;
    description: string;
    page_url: string;
    user_id: string;
    org_id?: string;
    session_id?: string;
  }): Promise<{ success: boolean; ticket_id?: string }> => {
    return apiClient.post('/support/log-bug', data);
  },

  // Admin methods
  getConversations: (params?: {
    days?: number;
    status?: string;
    orgId?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams(params as any);
    return apiClient.get(`/support/admin/conversations?${query}`);
  },

  getMetrics: (params?: {
    start_date?: string;
    end_date?: string;
    orgId?: string;
  }) => {
    const query = new URLSearchParams(params as any);
    return apiClient.get(`/support/admin/metrics?${query}`);
  },

  getConversation: (id: string) => {
    return apiClient.get(`/support/admin/conversation/${id}`);
  },
};

// Types for support API
export interface SupportCitation {
  title: string;
  articleId: string;
  javelinaUrl: string;
  confidence: number;
  lastUpdated: string;
}

export interface SupportChatResponse {
  reply: string;
  citations: SupportCitation[];
  intent: string;
  resolution: {
    needsConfirmation: boolean;
  };
  nextAction: {
    type: 'none' | 'ask_clarifying' | 'offer_ticket' | 'log_bug';
    reason: string;
  };
  conversationId?: string;
}

// Admin support interfaces
export interface SupportConversation {
  id: string;
  user_id: string;
  org_id: string;
  entry_point: string;
  page_url: string;
  tier: string;
  status: 'open' | 'resolved' | 'escalated';
  resolved: boolean;
  rating: number | null;
  feedback_comment: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
  user_email?: string;
  org_name?: string;
}

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender: 'user' | 'assistant';
  message: string;
  intent: string | null;
  citations: SupportCitation[] | null;
  attempt_count: number;
  created_at: string;
}

export interface SupportConversationsResponse {
  conversations: SupportConversation[];
  total: number;
  page: number;
  limit: number;
}

export interface SupportMetrics {
  total_conversations: number;
  resolved_conversations: number;
  escalated_conversations: number;
  avg_rating: number;
  avg_messages_per_conversation: number;
  resolution_rate: number;
  conversations_by_tier: Record<string, number>;
  conversations_by_entry_point: Record<string, number>;
  top_intents: Array<{ intent: string; count: number }>;
}

export interface SupportConversationDetail {
  conversation: SupportConversation;
  messages: SupportMessage[];
}

// Global search interfaces
export type GlobalSearchContext = 'member' | 'admin';
export type GlobalSearchScope = 'current' | 'all';
export type GlobalSearchResultType =
  | 'organization'
  | 'zone'
  | 'dns_record'
  | 'tag'
  | 'user'
  | 'discount_code'
  | 'audit_event'
  | 'support_conversation';

export interface GlobalSearchResult {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle: string;
  route: string;
  score: number;
  org_id?: string;
  zone_id?: string;
  record_id?: string;
  updated_at?: string;
  badge?: string;
}

export interface GlobalSearchResponse {
  query: string;
  scope: GlobalSearchScope;
  context: GlobalSearchContext;
  results: GlobalSearchResult[];
  counts: Record<string, number>;
  took_ms: number;
}

export const searchApi = {
  global: (params: {
    q: string;
    context: GlobalSearchContext;
    scope: GlobalSearchScope;
    org_id?: string;
    limit?: number;
    useAdminAuth?: boolean;
  }): Promise<GlobalSearchResponse> => {
    const query = new URLSearchParams();
    query.set('q', params.q);
    query.set('context', params.context);
    query.set('scope', params.scope);
    if (params.org_id) query.set('org_id', params.org_id);
    if (params.limit) query.set('limit', String(params.limit));
    return apiClient.get(`/search/global?${query.toString()}`);
  },
};

// ============================================================
// DOMAIN REGISTRATION API METHODS
// ============================================================

import type {
  LeadRecord,
  ResearchReport,
  SimilarityReport,
  UpsellRiskReport,
  ContentPlanReport,
  DesignDirectionReport,
} from '@/lib/schemas/intake';

import type {
  DomainSearchResponse,
  DomainPricingResponse,
  DomainCheckoutParams,
  DomainCheckoutResponse,
  DomainTransferCheckResponse,
  DomainTransferStatusResponse,
  DomainsListResponse,
  DomainDetailResponse,
  DomainManagementResponse,
  DomainContact,
  DomainRenewalResponse,
} from "@/types/domains";

import type {
  SslProductsListResponse,
  SslCheckoutParams,
  SslCheckoutResponse,
  CertificatesListResponse,
  CertificateDetailResponse,
  CertificateDownloadResponse,
  CSRValidationResponse,
  ApproverInfo,
  DvAuthMethod,
} from "@/types/certificates";

export const domainsApi = {
  search: (q: string, tlds?: string[]): Promise<DomainSearchResponse> => {
    const params = new URLSearchParams({ q });
    if (tlds?.length) params.set("tlds", tlds.join(","));
    return apiClient.get(`/domains/search?${params.toString()}`);
  },

  getPricing: (domain: string): Promise<DomainPricingResponse> =>
    apiClient.get(`/domains/pricing?domain=${encodeURIComponent(domain)}`),

  checkout: (params: DomainCheckoutParams): Promise<DomainCheckoutResponse> =>
    apiClient.post("/domains/checkout", params),

  checkTransfer: (domain: string): Promise<DomainTransferCheckResponse> =>
    apiClient.get(`/domains/transfer/check?domain=${encodeURIComponent(domain)}`),

  getTransferStatus: (id: string): Promise<DomainTransferStatusResponse> =>
    apiClient.get(`/domains/transfer/${id}/status`),

  list: (): Promise<DomainsListResponse> =>
    apiClient.get("/domains"),

  getById: (id: string): Promise<DomainDetailResponse> =>
    apiClient.get(`/domains/${id}`),

  link: (domain: string): Promise<DomainDetailResponse> =>
    apiClient.post("/domains/link", { domain }),

  getManagement: (id: string): Promise<DomainManagementResponse> =>
    apiClient.get(`/domains/${id}/manage`),

  updateContacts: (id: string, contact: DomainContact): Promise<{ success: boolean }> =>
    apiClient.put(`/domains/${id}/contacts`, { contact }),

  updateNameservers: (id: string, nameservers: string[]): Promise<{ success: boolean }> =>
    apiClient.put(`/domains/${id}/nameservers`, { nameservers }),

  setAutoRenew: (id: string, auto_renew: boolean): Promise<{ success: boolean; auto_renew: boolean }> =>
    apiClient.put(`/domains/${id}/auto-renew`, { auto_renew }),

  setLock: (id: string, locked: boolean): Promise<{ success: boolean; locked: boolean }> =>
    apiClient.put(`/domains/${id}/lock`, { locked }),

  unlink: (id: string): Promise<{ success: boolean }> =>
    apiClient.delete(`/domains/${id}`),

  renew: (id: string, years: number): Promise<DomainRenewalResponse> =>
    apiClient.post(`/domains/${id}/renew`, { years }),
};

// ============================================================
// MAILBOX API METHODS
// ============================================================

export const mailboxApi = {
  // Pricing
  getPricing: () =>
    apiClient.get("/mailbox/pricing"),

  // Email status
  getStatus: (domainId: string) =>
    apiClient.get(`/mailbox/domains/${domainId}/mail/status`),

  // Enable/disable
  enable: (domainId: string, tierId: string) =>
    apiClient.post(`/mailbox/domains/${domainId}/mail/enable`, { tier_id: tierId }),

  disable: (domainId: string) =>
    apiClient.delete(`/mailbox/domains/${domainId}/mail/disable`),

  // Plan
  changePlan: (domainId: string, tierId: string) =>
    apiClient.put(`/mailbox/domains/${domainId}/mail/plan`, { tier_id: tierId }),

  // Mailboxes
  listMailboxes: (domainId: string) =>
    apiClient.get(`/mailbox/domains/${domainId}/mailboxes`),

  createMailbox: (domainId: string, user: string, password: string) =>
    apiClient.post(`/mailbox/domains/${domainId}/mailboxes`, { user, password }),

  deleteMailbox: (domainId: string, mailboxUser: string) =>
    apiClient.delete(`/mailbox/domains/${domainId}/mailboxes/${encodeURIComponent(mailboxUser)}`),

  resetPassword: (domainId: string, mailboxUser: string, password: string) =>
    apiClient.put(`/mailbox/domains/${domainId}/mailboxes/${encodeURIComponent(mailboxUser)}/password`, { password }),

  // Aliases
  listAliases: (domainId: string) =>
    apiClient.get(`/mailbox/domains/${domainId}/aliases`),

  createAlias: (domainId: string, alias: string, target: string) =>
    apiClient.post(`/mailbox/domains/${domainId}/aliases`, { alias, target }),

  deleteAlias: (domainId: string, aliasName: string) =>
    apiClient.delete(`/mailbox/domains/${domainId}/aliases/${encodeURIComponent(aliasName)}`),
};

// ============================================================
// SSL CERTIFICATE API METHODS
// ============================================================

export const certificatesApi = {
  listProducts: (): Promise<SslProductsListResponse> =>
    apiClient.get("/certificates/products"),

  getProductPricing: (product_type: string): Promise<{ pricing: { price: number; currency: string; product_type: string } }> =>
    apiClient.get(`/certificates/products/pricing?product_type=${encodeURIComponent(product_type)}`),

  getApprovers: (domain: string, product_type: string): Promise<{ approvers: ApproverInfo[] }> =>
    apiClient.get(`/certificates/approvers?domain=${encodeURIComponent(domain)}&product_type=${encodeURIComponent(product_type)}`),

  validateCSR: (csr: string, product_type: string): Promise<CSRValidationResponse> =>
    apiClient.post("/certificates/validate-csr", { csr, product_type }),

  checkout: (params: SslCheckoutParams): Promise<SslCheckoutResponse> =>
    apiClient.post("/certificates/checkout", params),

  list: (domain?: string): Promise<CertificatesListResponse> => {
    const url = domain
      ? `/certificates?domain=${encodeURIComponent(domain)}`
      : "/certificates";
    return apiClient.get(url);
  },

  getById: (id: string): Promise<CertificateDetailResponse> =>
    apiClient.get(`/certificates/${id}`),

  getStatus: (id: string): Promise<{ certificate: any; order_info: any }> =>
    apiClient.get(`/certificates/${id}/status`),

  download: (id: string): Promise<CertificateDownloadResponse> =>
    apiClient.get(`/certificates/${id}/download`),

  cancel: (id: string): Promise<{ success: boolean }> =>
    apiClient.post(`/certificates/${id}/cancel`),

  updateValidation: (id: string, dv_auth_method: DvAuthMethod, approver_email?: string): Promise<{ success: boolean; dv_auth_details?: Record<string, any> }> =>
    apiClient.put(`/certificates/${id}/validation`, { dv_auth_method, approver_email }),

  resendApproval: (id: string): Promise<{ success: boolean }> =>
    apiClient.post(`/certificates/${id}/resend-approval`),
};

// Export everything
export default apiClient;
