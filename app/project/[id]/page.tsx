import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

// Mock project data matching sidebar structure
const mockProjectData: Record<string, any> = {
  'production': {
    id: 'production',
    name: 'Production',
    orgId: 'acme-corp',
    orgName: 'Acme Corp',
    description: 'Production environment for customer-facing services',
    zones: [
      { 
        id: 'acme-com', 
        name: 'acme.com', 
        records: 6, 
        queries24h: 45230,
        successRate: 99.8,
        avgResponseTime: 12,
        lastUpdated: '2025-10-07 14:23:15 UTC',
        status: 'active'
      },
      { 
        id: 'api-acme-com', 
        name: 'api.acme.com', 
        records: 4, 
        queries24h: 128450,
        successRate: 99.9,
        avgResponseTime: 8,
        lastUpdated: '2025-10-07 13:45:20 UTC',
        status: 'active'
      },
    ],
    stats: {
      totalZones: 2,
      totalRecords: 10,
      queries24h: 173680,
      avgResponseTime: 9,
      successRate: 99.85,
      qps: 2.01,
    },
    recentActivity: [
      { timestamp: '15 minutes ago', action: 'Zone updated', target: 'api.acme.com', user: 'john@acme.com', type: 'update' },
      { timestamp: '2 hours ago', action: 'Records modified', target: 'acme.com', user: 'admin@acme.com', type: 'update' },
      { timestamp: '5 hours ago', action: 'Zone reloaded', target: 'api.acme.com', user: 'john@acme.com', type: 'reload' },
      { timestamp: '1 day ago', action: 'TTL updated', target: 'acme.com', user: 'admin@acme.com', type: 'update' },
    ],
  },
  'staging': {
    id: 'staging',
    name: 'Staging',
    orgId: 'acme-corp',
    orgName: 'Acme Corp',
    description: 'Pre-production testing environment',
    zones: [
      { 
        id: 'staging-acme-com', 
        name: 'staging.acme.com', 
        records: 3, 
        queries24h: 8920,
        successRate: 98.5,
        avgResponseTime: 15,
        lastUpdated: '2025-10-07 12:10:05 UTC',
        status: 'active'
      },
    ],
    stats: {
      totalZones: 1,
      totalRecords: 3,
      queries24h: 8920,
      avgResponseTime: 15,
      successRate: 98.5,
      qps: 0.10,
    },
    recentActivity: [
      { timestamp: '3 hours ago', action: 'Zone updated', target: 'staging.acme.com', user: 'dev@acme.com', type: 'update' },
      { timestamp: '1 day ago', action: 'Test records added', target: 'staging.acme.com', user: 'qa@acme.com', type: 'create' },
      { timestamp: '2 days ago', action: 'Zone reloaded', target: 'staging.acme.com', user: 'dev@acme.com', type: 'reload' },
    ],
  },
  'blog': {
    id: 'blog',
    name: 'Blog',
    orgId: 'personal-projects',
    orgName: 'Personal Projects',
    description: 'Personal blog and content sites',
    zones: [
      { 
        id: 'blog-example-com', 
        name: 'blog.example.com', 
        records: 4, 
        queries24h: 3420,
        successRate: 99.1,
        avgResponseTime: 18,
        lastUpdated: '2025-10-07 10:30:42 UTC',
        status: 'active'
      },
    ],
    stats: {
      totalZones: 1,
      totalRecords: 4,
      queries24h: 3420,
      avgResponseTime: 18,
      successRate: 99.1,
      qps: 0.04,
    },
    recentActivity: [
      { timestamp: '2 days ago', action: 'Zone created', target: 'blog.example.com', user: 'user@example.com', type: 'create' },
      { timestamp: '3 days ago', action: 'Records added', target: 'blog.example.com', user: 'user@example.com', type: 'create' },
    ],
  },
};

export default async function ProjectPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const project = mockProjectData[id];

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Project Not Found</h1>
        <p className="text-gray-slate">The project &quot;{id}&quot; does not exist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Breadcrumb */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-sm text-gray-slate mb-2">
            <Link href={`/organization/${project.orgId}`} className="hover:text-orange">
              {project.orgName}
            </Link>
            <span>/</span>
            <span className="text-orange-dark font-medium">{project.name}</span>
          </div>
          <h1 className="text-3xl font-bold text-orange-dark mb-2">{project.name}</h1>
          <p className="text-gray-slate">{project.description}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Zone
          </Button>
          <Button variant="secondary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Button>
          <Button variant="secondary" className="!bg-red-600 hover:!bg-red-700 !text-white">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </Button>
          <Button variant="primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card title="Total Zones" className="p-6">
          <p className="text-3xl font-bold text-orange">{project.stats.totalZones}</p>
          <p className="text-sm text-gray-slate mt-1">{project.stats.totalRecords} DNS records</p>
        </Card>
        <Card title="Queries (24h)" className="p-6">
          <p className="text-3xl font-bold text-orange">{project.stats.queries24h.toLocaleString()}</p>
          <p className="text-sm text-gray-slate mt-1">{project.stats.qps} QPS average</p>
        </Card>
        <Card title="Success Rate" className="p-6">
          <p className="text-3xl font-bold text-orange">{project.stats.successRate}%</p>
          <p className="text-sm text-gray-slate mt-1">Last 24 hours</p>
        </Card>
        <Card title="Avg Response" className="p-6">
          <p className="text-3xl font-bold text-orange">{project.stats.avgResponseTime}ms</p>
          <p className="text-sm text-gray-slate mt-1">Response time</p>
        </Card>
      </div>

      {/* Zones and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card title="DNS Zones" className="p-6">
          <div className="space-y-3">
            {project.zones.map((zone: any) => (
              <Link
                key={zone.id}
                href={`/zone/${zone.id}`}
                className="block p-4 border border-gray-light rounded-lg hover:border-orange hover:bg-orange/5 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-orange-dark">{zone.name}</span>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                    {zone.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-slate text-xs">Records</p>
                    <p className="font-medium text-orange-dark">{zone.records}</p>
                  </div>
                  <div>
                    <p className="text-gray-slate text-xs">Queries (24h)</p>
                    <p className="font-medium text-orange-dark">{zone.queries24h.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-slate text-xs">Success Rate</p>
                    <p className="font-medium text-orange-dark">{zone.successRate}%</p>
                  </div>
                  <div>
                    <p className="text-gray-slate text-xs">Avg Response</p>
                    <p className="font-medium text-orange-dark">{zone.avgResponseTime}ms</p>
                  </div>
                </div>
                <p className="text-xs text-gray-slate mt-2">Updated: {zone.lastUpdated}</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card title="Recent Activity" className="p-6">
          <div className="space-y-4">
            {project.recentActivity.map((activity: any, index: number) => (
              <div key={index} className="flex items-start space-x-3 py-3 border-b border-gray-light last:border-0">
                <div className="flex-shrink-0 w-2 h-2 bg-orange rounded-full mt-2"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-orange-dark">{activity.action}</span>
                    <span className="text-xs text-gray-slate">{activity.timestamp}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-slate">
                    <span className="font-mono">{activity.target}</span>
                    <span>•</span>
                    <span>{activity.user}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Zone Performance Comparison */}
      <Card title="Zone Performance Comparison" className="p-6">
        <div className="space-y-4">
          {project.zones.map((zone: any) => (
            <div key={zone.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-orange-dark">{zone.name}</span>
                <span className="text-sm text-gray-slate">{zone.queries24h.toLocaleString()} queries</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <div className="bg-gray-light rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-orange h-full flex items-center justify-end px-2"
                      style={{ width: `${(zone.queries24h / project.stats.queries24h) * 100}%` }}
                    >
                      <span className="text-xs text-white font-medium">
                        {((zone.queries24h / project.stats.queries24h) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-slate w-16 text-right">{zone.avgResponseTime}ms</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}