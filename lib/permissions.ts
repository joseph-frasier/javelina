import { RBACRole } from './auth-store';

/**
 * Permission helper functions for role-based access control
 * Supports both organization-level and environment-level roles
 */

// Check if user can create environments in an organization
export function canCreateEnvironment(orgRole: RBACRole): boolean {
  return ['SuperAdmin', 'Admin'].includes(orgRole);
}

// Check if user can delete environments
export function canDeleteEnvironment(orgRole: RBACRole, envRole?: RBACRole): boolean {
  const effectiveRole = envRole || orgRole;
  return ['SuperAdmin', 'Admin'].includes(effectiveRole);
}

// Check if user can create zones in an environment
export function canCreateZone(orgRole: RBACRole, envRole?: RBACRole): boolean {
  const effectiveRole = envRole || orgRole;
  return ['SuperAdmin', 'Admin', 'Editor'].includes(effectiveRole);
}

// Check if user can edit zones
export function canEditZone(orgRole: RBACRole, envRole?: RBACRole): boolean {
  const effectiveRole = envRole || orgRole;
  return ['SuperAdmin', 'Admin', 'Editor'].includes(effectiveRole);
}

// Check if user can delete zones
export function canDeleteZone(orgRole: RBACRole, envRole?: RBACRole): boolean {
  const effectiveRole = envRole || orgRole;
  return ['SuperAdmin', 'Admin', 'Editor'].includes(effectiveRole);
}

// Check if user can edit DNS records
export function canEditRecords(orgRole: RBACRole, envRole?: RBACRole): boolean {
  const effectiveRole = envRole || orgRole;
  return ['SuperAdmin', 'Admin', 'Editor'].includes(effectiveRole);
}

// Check if user can view organization details
export function canViewOrganization(orgRole: RBACRole): boolean {
  // All roles can view (read-only access)
  return ['SuperAdmin', 'Admin', 'BillingContact', 'Editor', 'Viewer'].includes(orgRole);
}

// Check if user can manage organization settings
export function canManageOrganizationSettings(orgRole: RBACRole): boolean {
  return ['SuperAdmin', 'Admin'].includes(orgRole);
}

// Check if user can invite members to organization
export function canInviteMembers(orgRole: RBACRole): boolean {
  return ['SuperAdmin', 'Admin'].includes(orgRole);
}

// Check if user can manage member roles
export function canManageRoles(orgRole: RBACRole): boolean {
  return ['SuperAdmin', 'Admin'].includes(orgRole);
}

// Check if user can view billing information
export function canViewBilling(orgRole: RBACRole): boolean {
  return ['SuperAdmin', 'Admin', 'BillingContact'].includes(orgRole);
}

// Check if user can manage billing (view & update subscriptions, payment methods, etc.)
export function canManageBilling(orgRole: RBACRole): boolean {
  return ['SuperAdmin', 'Admin', 'BillingContact'].includes(orgRole);
}

// Check if user can change subscription plans
export function canChangePlan(orgRole: RBACRole): boolean {
  return ['SuperAdmin', 'Admin', 'BillingContact'].includes(orgRole);
}

// Check if user can update payment methods
export function canUpdatePaymentMethods(orgRole: RBACRole): boolean {
  return ['SuperAdmin', 'Admin', 'BillingContact'].includes(orgRole);
}

// Check if user can view and download invoices
export function canViewInvoices(orgRole: RBACRole): boolean {
  return ['SuperAdmin', 'Admin', 'BillingContact'].includes(orgRole);
}

// Check if user is read-only (for DNS/zones)
export function isReadOnly(orgRole: RBACRole, envRole?: RBACRole): boolean {
  const effectiveRole = envRole || orgRole;
  return effectiveRole === 'Viewer' || effectiveRole === 'BillingContact';
}

// Get effective role (environment role overrides org role if present)
export function getEffectiveRole(orgRole: RBACRole, envRole?: RBACRole): RBACRole {
  return envRole || orgRole;
}

// Check if environment role is more restrictive than org role
export function isRoleDowngrade(orgRole: RBACRole, envRole: RBACRole): boolean {
  const roleHierarchy: Record<RBACRole, number> = {
    'SuperAdmin': 5,
    'Admin': 4,
    'BillingContact': 3,
    'Editor': 2,
    'Viewer': 1
  };
  
  return roleHierarchy[envRole] < roleHierarchy[orgRole];
}

// Get role display text
export function getRoleDisplayText(role: RBACRole): string {
  const roleMap: Record<RBACRole, string> = {
    'SuperAdmin': 'SuperUser',
    'Admin': 'SuperUser',
    'BillingContact': 'Billing Contact',
    'Editor': 'Editor',
    'Viewer': 'Viewer'
  };
  
  return roleMap[role] || role;
}

// Get role badge color classes
export function getRoleBadgeColor(role: RBACRole): string {
  const colorMap: Record<RBACRole, string> = {
    'SuperAdmin': 'bg-orange-100 text-orange-800 border-orange-200',
    'Admin': 'bg-orange-100 text-orange-800 border-orange-200',
    'BillingContact': 'bg-blue-100 text-blue-800 border-blue-200',
    'Editor': 'bg-orange-100 text-orange-800 border-orange-200',
    'Viewer': 'bg-gray-100 text-gray-800 border-gray-200'
  };
  
  return colorMap[role] || 'bg-gray-100 text-gray-800 border-gray-200';
}

