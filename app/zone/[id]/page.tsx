import { ZoneDetailClient } from '@/app/zone/[id]/ZoneDetailClient';
import { getZoneById, getOrganizationById, getEnvironmentById } from '@/lib/mock-hierarchy-data';

// Mock DNS records data
const mockZoneData: Record<string, any> = {
  'zone_company_prod_1': {
    name: 'company.com',
    serial: '2025100701',
    lastUpdated: '2025-10-07 14:23:15 UTC',
    ttl: 3600,
    nameservers: ['ns1.acme.com', 'ns2.acme.com'],
    soa: {
      primary: 'ns1.acme.com',
      email: 'admin@acme.com',
      serial: '2025100701',
      refresh: 3600,
      retry: 600,
      expire: 604800,
      minimum: 86400,
    },
    records: [
      { id: 1, name: '@', type: 'A', value: '192.0.2.1', ttl: 3600, status: 'active' },
      { id: 2, name: '@', type: 'AAAA', value: '2001:db8::1', ttl: 3600, status: 'active' },
      { id: 3, name: 'www', type: 'CNAME', value: 'acme.com', ttl: 3600, status: 'active' },
      { id: 4, name: '@', type: 'MX', value: '10 mail.acme.com', ttl: 3600, status: 'active' },
      { id: 5, name: '@', type: 'TXT', value: '"v=spf1 include:_spf.acme.com ~all"', ttl: 3600, status: 'active' },
      { id: 6, name: 'mail', type: 'A', value: '192.0.2.10', ttl: 3600, status: 'active' },
    ],
    queryStats: {
      last24h: 45230,
      avgResponseTime: 12,
      successRate: 99.8,
      qps: 0.52,
    },
    queryTypes: [
      { type: 'A', count: 28450, percentage: 62.9 },
      { type: 'AAAA', count: 12340, percentage: 27.3 },
      { type: 'MX', count: 3120, percentage: 6.9 },
      { type: 'TXT', count: 890, percentage: 2.0 },
      { type: 'CNAME', count: 430, percentage: 0.9 },
    ],
    recentQueries: [
      { timestamp: '15:42:33', client: '203.0.113.45', type: 'A', name: 'acme.com', response: 'NOERROR', time: '8ms' },
      { timestamp: '15:42:31', client: '198.51.100.23', type: 'AAAA', name: 'www.acme.com', response: 'NOERROR', time: '12ms' },
      { timestamp: '15:42:28', client: '192.0.2.156', type: 'MX', name: 'acme.com', response: 'NOERROR', time: '15ms' },
      { timestamp: '15:42:25', client: '203.0.113.89', type: 'A', name: 'mail.acme.com', response: 'NOERROR', time: '9ms' },
      { timestamp: '15:42:22', client: '198.51.100.67', type: 'TXT', name: 'acme.com', response: 'NOERROR', time: '11ms' },
    ],
  },
  'zone_company_prod_2': {
    name: 'api.company.com',
    serial: '2025100702',
    lastUpdated: '2025-10-07 13:45:20 UTC',
    ttl: 300,
    nameservers: ['ns1.acme.com', 'ns2.acme.com'],
    soa: {
      primary: 'ns1.acme.com',
      email: 'admin@acme.com',
      serial: '2025100702',
      refresh: 3600,
      retry: 600,
      expire: 604800,
      minimum: 86400,
    },
    records: [
      { id: 1, name: '@', type: 'A', value: '192.0.2.20', ttl: 300, status: 'active' },
      { id: 2, name: '@', type: 'AAAA', value: '2001:db8::20', ttl: 300, status: 'active' },
      { id: 3, name: 'v1', type: 'CNAME', value: 'api.acme.com', ttl: 300, status: 'active' },
      { id: 4, name: 'v2', type: 'A', value: '192.0.2.21', ttl: 300, status: 'active' },
    ],
    queryStats: {
      last24h: 128450,
      avgResponseTime: 8,
      successRate: 99.9,
      qps: 1.49,
    },
    queryTypes: [
      { type: 'A', count: 98340, percentage: 76.6 },
      { type: 'AAAA', count: 28110, percentage: 21.9 },
      { type: 'CNAME', count: 2000, percentage: 1.5 },
    ],
    recentQueries: [
      { timestamp: '15:42:35', client: '203.0.113.12', type: 'A', name: 'api.acme.com', response: 'NOERROR', time: '6ms' },
      { timestamp: '15:42:34', client: '198.51.100.99', type: 'A', name: 'v2.api.acme.com', response: 'NOERROR', time: '7ms' },
      { timestamp: '15:42:33', client: '192.0.2.88', type: 'AAAA', name: 'api.acme.com', response: 'NOERROR', time: '8ms' },
      { timestamp: '15:42:31', client: '203.0.113.56', type: 'A', name: 'api.acme.com', response: 'NOERROR', time: '5ms' },
      { timestamp: '15:42:29', client: '198.51.100.34', type: 'CNAME', name: 'v1.api.acme.com', response: 'NOERROR', time: '9ms' },
    ],
  },
  'zone_company_staging_1': {
    name: 'staging.company.com',
    serial: '2025100703',
    lastUpdated: '2025-10-07 12:10:05 UTC',
    ttl: 600,
    nameservers: ['ns1.acme.com', 'ns2.acme.com'],
    soa: {
      primary: 'ns1.acme.com',
      email: 'admin@acme.com',
      serial: '2025100703',
      refresh: 3600,
      retry: 600,
      expire: 604800,
      minimum: 86400,
    },
    records: [
      { id: 1, name: '@', type: 'A', value: '192.0.2.100', ttl: 600, status: 'active' },
      { id: 2, name: '@', type: 'AAAA', value: '2001:db8::100', ttl: 600, status: 'active' },
      { id: 3, name: 'www', type: 'CNAME', value: 'staging.acme.com', ttl: 600, status: 'active' },
    ],
    queryStats: {
      last24h: 8920,
      avgResponseTime: 15,
      successRate: 98.5,
      qps: 0.10,
    },
    queryTypes: [
      { type: 'A', count: 6230, percentage: 69.8 },
      { type: 'AAAA', count: 2340, percentage: 26.2 },
      { type: 'CNAME', count: 350, percentage: 4.0 },
    ],
    recentQueries: [
      { timestamp: '15:41:20', client: '10.0.1.45', type: 'A', name: 'staging.acme.com', response: 'NOERROR', time: '14ms' },
      { timestamp: '15:40:55', client: '10.0.1.23', type: 'AAAA', name: 'www.staging.acme.com', response: 'NOERROR', time: '16ms' },
      { timestamp: '15:40:12', client: '10.0.1.67', type: 'A', name: 'staging.acme.com', response: 'NOERROR', time: '13ms' },
    ],
  },
  'zone_personal_prod_1': {
    name: 'blog.example.com',
    serial: '2025100704',
    lastUpdated: '2025-10-07 10:30:42 UTC',
    ttl: 7200,
    nameservers: ['ns1.example.com', 'ns2.example.com'],
    soa: {
      primary: 'ns1.example.com',
      email: 'admin@example.com',
      serial: '2025100704',
      refresh: 3600,
      retry: 600,
      expire: 604800,
      minimum: 86400,
    },
    records: [
      { id: 1, name: '@', type: 'A', value: '198.51.100.50', ttl: 7200, status: 'active' },
      { id: 2, name: '@', type: 'AAAA', value: '2001:db8::50', ttl: 7200, status: 'active' },
      { id: 3, name: 'www', type: 'CNAME', value: 'blog.example.com', ttl: 7200, status: 'active' },
      { id: 4, name: '@', type: 'TXT', value: '"v=spf1 -all"', ttl: 7200, status: 'active' },
    ],
    queryStats: {
      last24h: 3420,
      avgResponseTime: 18,
      successRate: 99.1,
      qps: 0.04,
    },
    queryTypes: [
      { type: 'A', count: 2340, percentage: 68.4 },
      { type: 'AAAA', count: 890, percentage: 26.0 },
      { type: 'CNAME', count: 150, percentage: 4.4 },
      { type: 'TXT', count: 40, percentage: 1.2 },
    ],
    recentQueries: [
      { timestamp: '15:38:45', client: '203.0.113.78', type: 'A', name: 'blog.example.com', response: 'NOERROR', time: '16ms' },
      { timestamp: '15:35:20', client: '198.51.100.45', type: 'AAAA', name: 'www.blog.example.com', response: 'NOERROR', time: '19ms' },
      { timestamp: '15:32:10', client: '192.0.2.123', type: 'A', name: 'blog.example.com', response: 'NOERROR', time: '17ms' },
    ],
  },
};

export default async function ZonePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  
  // Get zone metadata from hierarchy
  const zoneMetadata = getZoneById(id);
  const zone = mockZoneData[id];

  // If zone not found, show error
  if (!zone) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Zone Not Found</h1>
        <p className="text-gray-slate">The zone &quot;{id}&quot; does not exist.</p>
      </div>
    );
  }

  // Get organization and environment context
  let organization = null;
  let environment = null;
  
  if (zoneMetadata) {
    organization = getOrganizationById(zoneMetadata.org_id);
    environment = getEnvironmentById(zoneMetadata.env_id);
  }

  return (
    <ZoneDetailClient 
      zone={zone} 
      zoneId={id}
      organization={organization}
      environment={environment}
    />
  );
}