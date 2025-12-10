import { getURL } from './get-url';

/**
 * Breadcrumb utility for generating breadcrumb navigation and structured data
 * Follows Schema.org BreadcrumbList format
 */

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Generate breadcrumb structured data (Schema.org JSON-LD)
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  const baseUrl = getURL();
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  };
}

/**
 * Common breadcrumb paths for the application
 */
export const BREADCRUMB_PATHS = {
  home: { name: 'Home', url: '/' },
  pricing: { name: 'Pricing', url: '/pricing' },
  login: { name: 'Login', url: '/login' },
  signup: { name: 'Sign Up', url: '/signup' },
  profile: { name: 'Profile', url: '/profile' },
  settings: { name: 'Settings', url: '/settings' },
  organizations: { name: 'Organizations', url: '/organization' },
  zones: { name: 'Zones', url: '/zone' },
  admin: { name: 'Admin', url: '/admin' },
  adminOrganizations: { name: 'Organizations', url: '/admin/organizations' },
  adminUsers: { name: 'Users', url: '/admin/users' },
  adminZones: { name: 'Zones', url: '/admin/zones' },
  adminDiscounts: { name: 'Discounts', url: '/admin/discounts' },
  adminAudit: { name: 'Audit Log', url: '/admin/audit' },
};

/**
 * Generate breadcrumbs for a specific page
 */
export function getBreadcrumbs(pageKey: keyof typeof BREADCRUMB_PATHS): BreadcrumbItem[] {
  const paths: Record<string, BreadcrumbItem[]> = {
    home: [BREADCRUMB_PATHS.home],
    pricing: [BREADCRUMB_PATHS.home, BREADCRUMB_PATHS.pricing],
    login: [BREADCRUMB_PATHS.home, BREADCRUMB_PATHS.login],
    signup: [BREADCRUMB_PATHS.home, BREADCRUMB_PATHS.signup],
    profile: [BREADCRUMB_PATHS.home, BREADCRUMB_PATHS.profile],
    settings: [BREADCRUMB_PATHS.home, BREADCRUMB_PATHS.settings],
    organizations: [BREADCRUMB_PATHS.home, BREADCRUMB_PATHS.organizations],
    zones: [BREADCRUMB_PATHS.home, BREADCRUMB_PATHS.zones],
    admin: [BREADCRUMB_PATHS.home, BREADCRUMB_PATHS.admin],
    adminOrganizations: [BREADCRUMB_PATHS.home, BREADCRUMB_PATHS.admin, BREADCRUMB_PATHS.adminOrganizations],
    adminUsers: [BREADCRUMB_PATHS.home, BREADCRUMB_PATHS.admin, BREADCRUMB_PATHS.adminUsers],
    adminZones: [BREADCRUMB_PATHS.home, BREADCRUMB_PATHS.admin, BREADCRUMB_PATHS.adminZones],
    adminDiscounts: [BREADCRUMB_PATHS.home, BREADCRUMB_PATHS.admin, BREADCRUMB_PATHS.adminDiscounts],
    adminAudit: [BREADCRUMB_PATHS.home, BREADCRUMB_PATHS.admin, BREADCRUMB_PATHS.adminAudit],
  };
  
  return paths[pageKey] || [BREADCRUMB_PATHS.home];
}

