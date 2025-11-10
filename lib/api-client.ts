/**
 * Centralized API Client for Express Backend
 * 
 * This client handles all communication with the Express API backend,
 * automatically attaching JWT tokens from Supabase auth and handling errors.
 */

import { createClient } from '@/lib/supabase/client';

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

// Get JWT token from Supabase auth
async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// Generic API request function
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    // Get auth token
    const token = await getAuthToken();

    // Build headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Make request
    const url = `${API_BASE_URL}/api${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
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

// Stripe API
export const stripeApi = {
  /**
   * Create a subscription intent
   */
  createSubscription: (org_id: string, price_id: string) => {
    return apiClient.post('/stripe/subscriptions', { org_id, price_id });
  },

  /**
   * Create a billing portal session
   */
  createPortalSession: (org_id: string) => {
    return apiClient.post('/stripe/portal-session', { org_id });
  },

  /**
   * Update a subscription
   */
  updateSubscription: (org_id: string, new_price_id: string) => {
    return apiClient.post('/stripe/subscriptions/update', { org_id, new_price_id });
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
   * Check if organization can create a resource
   */
  canCreate: (org_id: string, resource_type: 'environment' | 'zone' | 'member') => {
    return apiClient.get(`/subscriptions/can-create?org_id=${org_id}&resource_type=${resource_type}`);
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

// Entitlements API
export const entitlementsApi = {
  /**
   * Check a specific entitlement
   */
  check: (org_id: string, entitlement_key: string) => {
    return apiClient.get(`/entitlements/check?org_id=${org_id}&entitlement_key=${entitlement_key}`);
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
  create: (data: { name: string; description?: string }) => {
    return apiClient.post('/organizations', data);
  },

  /**
   * Update an organization
   */
  update: (id: string, data: { name: string; description?: string }) => {
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
};

// Environments API
export const environmentsApi = {
  /**
   * List all environments
   */
  list: () => {
    return apiClient.get('/environments');
  },

  /**
   * List environments for an organization
   */
  listByOrg: (orgId: string) => {
    return apiClient.get(`/environments/organization/${orgId}`);
  },

  /**
   * Get environment by ID
   */
  get: (id: string) => {
    return apiClient.get(`/environments/${id}`);
  },

  /**
   * Create a new environment
   */
  create: (data: { name: string; org_id: string; type: string; description?: string }) => {
    return apiClient.post('/environments', data);
  },

  /**
   * Update an environment
   */
  update: (id: string, data: { name?: string; type?: string; description?: string }) => {
    return apiClient.put(`/environments/${id}`, data);
  },

  /**
   * Delete an environment
   */
  delete: (id: string) => {
    return apiClient.delete(`/environments/${id}`);
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
   * List zones for an environment
   */
  listByEnvironment: (envId: string) => {
    return apiClient.get(`/zones/environment/${envId}`);
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
  create: (data: { name: string; env_id: string; type: string; description?: string }) => {
    return apiClient.post('/zones', data);
  },

  /**
   * Update a zone
   */
  update: (id: string, data: { name?: string; type?: string; description?: string }) => {
    return apiClient.put(`/zones/${id}`, data);
  },

  /**
   * Delete a zone
   */
  delete: (id: string) => {
    return apiClient.delete(`/zones/${id}`);
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
   * List all users (admin only)
   */
  listUsers: () => {
    return apiClient.get('/admin/users');
  },

  /**
   * List all organizations (admin only)
   */
  listOrganizations: () => {
    return apiClient.get('/admin/organizations');
  },

  /**
   * Get all audit logs (admin only)
   */
  getAuditLogs: () => {
    return apiClient.get('/admin/audit-logs');
  },
};

// Export everything
export default apiClient;

