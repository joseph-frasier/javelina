import { RBACRole, EnvironmentType } from './auth-store';

export interface Zone {
  // Database fields (match Supabase schema)
  id: string;
  environment_id: string;
  name: string;
  zone_type: 'primary' | 'secondary' | 'redirect';
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  
  // UI-only fields (optional, not in database)
  records?: number;
  queries_24h?: number;
  status?: 'active' | 'paused' | 'error';
  last_modified?: string;
}

export interface EnvironmentDetail {
  // Database fields (match Supabase schema)
  id: string;
  organization_id: string;
  name: string;
  environment_type: EnvironmentType;
  location: string | null;
  status: 'active' | 'disabled' | 'archived';
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  
  // UI-only fields (optional, not in database)
  zones_count?: number;
  total_records?: number;
  queries_24h?: number;
  success_rate?: number;
  avg_response_time?: number;
  role?: RBACRole;
}

export interface OrganizationDetail {
  id: string;
  name: string;
  description: string;
  role: RBACRole;
  environments: EnvironmentDetail[];
  stats: {
    totalEnvironments: number;
    totalZones: number;
    totalRecords: number;
    queries24h: number;
    avgResponseTime: number;
    successRate: number;
  };
  recentActivity: {
    timestamp: string;
    action: string;
    target: string;
    user: string;
  }[];
}

// Mock Organizations with full details
export const mockOrganizations: OrganizationDetail[] = [
  {
    id: 'org_company',
    name: 'Company Corp',
    description: 'Production, staging, and development environments for Company Corporation',
    role: 'SuperAdmin',
    environments: [
      {
        id: 'env_prod',
        organization_id: 'org_company',
        name: 'Production',
        environment_type: 'production',
        location: null,
        status: 'active',
        description: 'Live production environment',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        zones_count: 120,
        total_records: 1450,
        queries_24h: 2450000,
        success_rate: 99.8,
        avg_response_time: 12,
        role: 'SuperAdmin'
      },
      {
        id: 'env_staging',
        organization_id: 'org_company',
        name: 'Staging',
        environment_type: 'staging',
        location: null,
        status: 'active',
        description: 'Pre-production testing environment',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        zones_count: 80,
        total_records: 950,
        queries_24h: 450000,
        success_rate: 99.5,
        avg_response_time: 15,
        role: 'SuperAdmin'
      },
      {
        id: 'env_dev',
        organization_id: 'org_company',
        name: 'Development',
        environment_type: 'development',
        location: null,
        status: 'active',
        description: 'Development environment',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        zones_count: 34,
        total_records: 380,
        queries_24h: 85000,
        success_rate: 98.9,
        avg_response_time: 18,
        role: 'SuperAdmin'
      }
    ],
    stats: {
      totalEnvironments: 3,
      totalZones: 234,
      totalRecords: 2780,
      queries24h: 2985000,
      avgResponseTime: 13,
      successRate: 99.6
    },
    recentActivity: [
      {
        timestamp: '2 minutes ago',
        action: 'Zone created',
        target: 'api.company.com',
        user: 'marcus.rodriguez@company.com'
      },
      {
        timestamp: '1 hour ago',
        action: 'Records updated',
        target: 'company.com',
        user: 'sarah.chen@company.com'
      },
      {
        timestamp: '3 hours ago',
        action: 'Environment deployed',
        target: 'Staging',
        user: 'marcus.rodriguez@company.com'
      },
      {
        timestamp: '5 hours ago',
        action: 'Zone migrated',
        target: 'staging.company.com',
        user: 'sarah.chen@company.com'
      }
    ]
  },
  {
    id: 'org_personal',
    name: 'Personal Projects',
    description: 'Personal domains and side projects',
    role: 'SuperAdmin',
    environments: [
      {
        id: 'env_personal_prod',
        organization_id: 'org_personal',
        name: 'Production',
        environment_type: 'production',
        location: null,
        status: 'active',
        description: 'Personal projects production environment',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        zones_count: 5,
        total_records: 45,
        queries_24h: 12000,
        success_rate: 99.2,
        avg_response_time: 22,
        role: 'SuperAdmin'
      },
      {
        id: 'env_personal_dev',
        organization_id: 'org_personal',
        name: 'Development',
        environment_type: 'development',
        location: null,
        status: 'active',
        description: 'Personal projects development environment',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        zones_count: 3,
        total_records: 28,
        queries_24h: 3500,
        success_rate: 98.5,
        avg_response_time: 25,
        role: 'SuperAdmin'
      }
    ],
    stats: {
      totalEnvironments: 2,
      totalZones: 8,
      totalRecords: 73,
      queries24h: 15500,
      avgResponseTime: 23,
      successRate: 98.9
    },
    recentActivity: [
      {
        timestamp: '1 day ago',
        action: 'Zone updated',
        target: 'blog.example.com',
        user: 'marcus.rodriguez@company.com'
      },
      {
        timestamp: '2 days ago',
        action: 'Records modified',
        target: 'portfolio.example.com',
        user: 'marcus.rodriguez@company.com'
      }
    ]
  }
];

// Mock Zones
export const mockZones: Zone[] = [
  // Company Corp - Production
  {
    id: 'zone_company_prod_1',
    name: 'company.com',
    environment_id: 'env_prod',
    zone_type: 'primary',
    description: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-10-01T00:00:00Z',
    created_by: null,
    records: 24,
    queries_24h: 1250000,
    status: 'active',
    last_modified: '2025-10-08T14:30:00Z'
  },
  {
    id: 'zone_company_prod_2',
    name: 'api.company.com',
    environment_id: 'env_prod',
    zone_type: 'primary',
    description: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-10-01T00:00:00Z',
    created_by: null,
    records: 18,
    queries_24h: 890000,
    status: 'active',
    last_modified: '2025-10-09T08:15:00Z'
  },
  {
    id: 'zone_company_prod_3',
    name: 'cdn.company.com',
    environment_id: 'env_prod',
    zone_type: 'primary',
    description: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-10-01T00:00:00Z',
    created_by: null,
    records: 12,
    queries_24h: 310000,
    status: 'active',
    last_modified: '2025-10-07T22:45:00Z'
  },
  // Company Corp - Staging
  {
    id: 'zone_company_staging_1',
    name: 'staging.company.com',
    environment_id: 'env_staging',
    zone_type: 'primary',
    description: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-10-01T00:00:00Z',
    created_by: null,
    records: 20,
    queries_24h: 180000,
    status: 'active',
    last_modified: '2025-10-09T11:20:00Z'
  },
  {
    id: 'zone_company_staging_2',
    name: 'api-staging.company.com',
    environment_id: 'env_staging',
    zone_type: 'primary',
    description: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-10-01T00:00:00Z',
    created_by: null,
    records: 16,
    queries_24h: 145000,
    status: 'active',
    last_modified: '2025-10-08T16:30:00Z'
  },
  {
    id: 'zone_company_staging_3',
    name: 'test.company.com',
    environment_id: 'env_staging',
    zone_type: 'primary',
    description: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-10-01T00:00:00Z',
    created_by: null,
    records: 8,
    queries_24h: 125000,
    status: 'active',
    last_modified: '2025-10-09T09:10:00Z'
  },
  // Company Corp - Development
  {
    id: 'zone_company_dev_1',
    name: 'dev.company.com',
    environment_id: 'env_dev',
    zone_type: 'primary',
    description: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-10-01T00:00:00Z',
    created_by: null,
    records: 15,
    queries_24h: 45000,
    status: 'active',
    last_modified: '2025-10-09T13:05:00Z'
  },
  {
    id: 'zone_company_dev_2',
    name: 'local.company.com',
    environment_id: 'env_dev',
    zone_type: 'primary',
    description: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-10-01T00:00:00Z',
    created_by: null,
    records: 10,
    queries_24h: 28000,
    status: 'active',
    last_modified: '2025-10-08T19:40:00Z'
  },
  {
    id: 'zone_company_dev_3',
    name: 'sandbox.company.com',
    environment_id: 'env_dev',
    zone_type: 'primary',
    description: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-10-01T00:00:00Z',
    created_by: null,
    records: 6,
    queries_24h: 12000,
    status: 'paused',
    last_modified: '2025-10-06T10:20:00Z'
  },
  // Personal Projects - Production
  {
    id: 'zone_personal_prod_1',
    name: 'blog.example.com',
    environment_id: 'env_personal_prod',
    zone_type: 'primary',
    description: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-10-01T00:00:00Z',
    created_by: null,
    records: 12,
    queries_24h: 6500,
    status: 'active',
    last_modified: '2025-10-08T20:15:00Z'
  },
  {
    id: 'zone_personal_prod_2',
    name: 'portfolio.example.com',
    environment_id: 'env_personal_prod',
    zone_type: 'primary',
    description: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-10-01T00:00:00Z',
    created_by: null,
    records: 8,
    queries_24h: 3200,
    status: 'active',
    last_modified: '2025-10-07T14:30:00Z'
  },
  {
    id: 'zone_personal_prod_3',
    name: 'projects.example.com',
    environment_id: 'env_personal_prod',
    zone_type: 'primary',
    description: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-10-01T00:00:00Z',
    created_by: null,
    records: 5,
    queries_24h: 2300,
    status: 'active',
    last_modified: '2025-10-09T07:45:00Z'
  },
  // Personal Projects - Development
  {
    id: 'zone_personal_dev_1',
    name: 'dev.blog.example.com',
    environment_id: 'env_personal_dev',
    zone_type: 'primary',
    description: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-10-01T00:00:00Z',
    created_by: null,
    records: 10,
    queries_24h: 2100,
    status: 'active',
    last_modified: '2025-10-09T12:00:00Z'
  },
  {
    id: 'zone_personal_dev_2',
    name: 'test.portfolio.example.com',
    environment_id: 'env_personal_dev',
    zone_type: 'primary',
    description: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-10-01T00:00:00Z',
    created_by: null,
    records: 6,
    queries_24h: 1400,
    status: 'active',
    last_modified: '2025-10-08T18:20:00Z'
  }
];

// Helper functions
export function getOrganizationById(orgId: string): OrganizationDetail | undefined {
  return mockOrganizations.find(org => org.id === orgId);
}

export function getEnvironmentById(envId: string): EnvironmentDetail | undefined {
  for (const org of mockOrganizations) {
    const env = org.environments.find(e => e.id === envId);
    if (env) return env;
  }
  return undefined;
}

export function getZonesByEnvironment(envId: string): Zone[] {
  return mockZones.filter(zone => zone.environment_id === envId);
}

export function getZoneById(zoneId: string): Zone | undefined {
  return mockZones.find(zone => zone.id === zoneId);
}

export function getAllOrganizations(): OrganizationDetail[] {
  return mockOrganizations;
}

