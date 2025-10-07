import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

// Mock organization data matching sidebar structure
const mockOrganizationData: Record<string, any> = {
  'acme-corp': {
    id: 'acme-corp',
    name: 'Acme Corp',
    description: 'Production and staging environments for Acme Corporation',
    projects: [
      {
        id: 'production',
        name: 'Production',
        zones: [
          { id: 'acme-com', name: 'acme.com', records: 6, queries24h: 45230 },
          { id: 'api-acme-com', name: 'api.acme.com', records: 4, queries24h: 128450 },
        ],
      },
      {
        id: 'staging',
        name: 'Staging',
        zones: [
          { id: 'staging-acme-com', name: 'staging.acme.com', records: 3, queries24h: 8920 },
        ],
      },
    ],
    stats: {
      totalProjects: 2,
      totalZones: 3,
      totalRecords: 13,
      queries24h: 182600,
      avgResponseTime: 11,
      successRate: 99.7,
    },
    recentActivity: [
      { timestamp: '2 minutes ago', action: 'Zone updated', target: 'api.acme.com', user: 'john@acme.com' },
      { timestamp: '1 hour ago', action: 'Records added', target: 'acme.com', user: 'admin@acme.com' },
      { timestamp: '3 hours ago', action: 'Zone reloaded', target: 'staging.acme.com', user: 'john@acme.com' },
      { timestamp: '5 hours ago', action: 'Project created', target: 'staging', user: 'admin@acme.com' },
    ],
  },
  'personal-projects': {
    id: 'personal-projects',
    name: 'Personal Projects',
    description: 'Personal domains and side projects',
    projects: [
      {
        id: 'blog',
        name: 'Blog',
        zones: [
          { id: 'blog-example-com', name: 'blog.example.com', records: 4, queries24h: 3420 },
        ],
      },
    ],
    stats: {
      totalProjects: 1,
      totalZones: 1,
      totalRecords: 4,
      queries24h: 3420,
      avgResponseTime: 18,
      successRate: 99.1,
    },
    recentActivity: [
      { timestamp: '1 day ago', action: 'Zone updated', target: 'blog.example.com', user: 'user@example.com' },
      { timestamp: '2 days ago', action: 'Records modified', target: 'blog.example.com', user: 'user@example.com' },
    ],
  },
};

export default async function OrganizationPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const org = mockOrganizationData[id];

  if (!org) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Organization Not Found</h1>
        <p className="text-gray-slate">The organization &quot;{id}&quot; does not exist.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-orange-dark mb-2">{org.name}</h1>
          <p className="text-gray-slate">{org.description}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Project
          </Button>
          <Button variant="secondary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Add Zone
          </Button>
          <Button variant="primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card title="Total Projects" className="p-6">
          <p className="text-3xl font-bold text-orange">{org.stats.totalProjects}</p>
          <p className="text-sm text-gray-slate mt-1">Active projects</p>
        </Card>
        <Card title="Total Zones" className="p-6">
          <p className="text-3xl font-bold text-orange">{org.stats.totalZones}</p>
          <p className="text-sm text-gray-slate mt-1">{org.stats.totalRecords} DNS records</p>
        </Card>
        <Card title="Queries (24h)" className="p-6">
          <p className="text-3xl font-bold text-orange">{org.stats.queries24h.toLocaleString()}</p>
          <p className="text-sm text-gray-slate mt-1">{org.stats.successRate}% success rate</p>
        </Card>
        <Card title="Avg Response" className="p-6">
          <p className="text-3xl font-bold text-orange">{org.stats.avgResponseTime}ms</p>
          <p className="text-sm text-gray-slate mt-1">Response time</p>
        </Card>
      </div>

      {/* Projects and Zones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card title="Projects & Zones" className="p-6">
          <div className="space-y-6">
            {org.projects.map((project: any) => (
              <div key={project.id}>
                <Link 
                  href={`/project/${project.id}`}
                  className="flex items-center space-x-2 mb-3 group"
                >
                  <svg className="w-5 h-5 text-blue-electric" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="font-medium text-orange-dark group-hover:text-orange">{project.name}</span>
                  <span className="text-xs text-gray-slate">({project.zones.length} zones)</span>
                </Link>
                <div className="ml-7 space-y-2">
                  {project.zones.map((zone: any) => (
                    <Link
                      key={zone.id}
                      href={`/zone/${zone.id}`}
                      className="flex items-center justify-between py-2 px-3 hover:bg-gray-light rounded-md transition-colors group"
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-slate group-hover:text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-slate group-hover:text-orange">{zone.name}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-slate">
                        <span>{zone.records} records</span>
                        <span>{zone.queries24h.toLocaleString()} queries</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Recent Activity" className="p-6">
          <div className="space-y-4">
            {org.recentActivity.map((activity: any, index: number) => (
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
    </div>
  );
}