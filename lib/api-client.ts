/**
 * Centralized API Client for Express Backend
 * 
 * This client handles all communication with the Express API backend,
 * automatically attaching JWT tokens from Supabase auth and handling errors.
 */

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

    // Make request with credentials for session cookies
    const url = `${API_BASE_URL}/api${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Send/receive session cookies
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
   * Add a member to an organization
   */
  addMember: (id: string, data: { email: string; role: 'Admin' | 'Editor' | 'BillingContact' | 'Viewer' }) => {
    return apiClient.post(`/organizations/${id}/members`, data);
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

// Export everything
export default apiClient;

