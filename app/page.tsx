import Link from 'next/link';
import { StatCard, Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';

export default function DashboardPage() {
  // Aggregate stats from all organizations
  // In production, this would come from API based on user's orgs
  const aggregateStats = {
    totalOrgs: 2,
    totalEnvironments: 5,
    totalZones: 242,
    totalQueries24h: 3000500
  };

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="font-black font-sans text-4xl text-orange-dark mb-2">
          Innovate. Connect. Empower.
        </h1>
        <p className="font-light text-gray-slate text-lg">
          Welcome back to your Javelina dashboard
        </p>
      </div>

      {/* Stats Grid - Updated for new hierarchy */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
            title="Total Organizations"
            value={aggregateStats.totalOrgs.toString()}
            change="Your organizations"
            changeType="neutral"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            }
          />

          <StatCard
            title="Total Environments"
            value={aggregateStats.totalEnvironments.toString()}
            change="Across all orgs"
            changeType="neutral"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                />
              </svg>
            }
          />

          <StatCard
            title="Total DNS Zones"
            value={aggregateStats.totalZones.toString()}
            change="+12 this month"
            changeType="positive"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />

          <StatCard
            title="DNS Queries (24h)"
            value={`${(aggregateStats.totalQueries24h / 1000000).toFixed(1)}M`}
            change="+5.2% from yesterday"
            changeType="positive"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            }
          />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card
          title="Quick Actions"
          description="Common tasks and shortcuts"
          className="lg:col-span-1"
        >
          <div className="space-y-4 mt-4">
            <Link href="/organization/org_company">
              <Button variant="primary" className="w-full justify-start">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                View Organizations
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="secondary" className="w-full justify-start">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                View Analytics
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" className="w-full justify-start">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Settings
              </Button>
            </Link>
          </div>
        </Card>

        <Card
          title="Recent Activity"
          description="Latest updates and changes"
          className="lg:col-span-2"
        >
          <div className="space-y-4 mt-4">
            {[
              {
                action: 'Zone created: api.company.com',
                time: '5 minutes ago',
                type: 'zone',
              },
              {
                action: 'Environment deployed: Staging',
                time: '1 hour ago',
                type: 'environment',
              },
              {
                action: 'Records updated: company.com',
                time: '2 hours ago',
                type: 'records',
              },
              {
                action: 'New organization added',
                time: 'Yesterday',
                type: 'org',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 border-b border-gray-light last:border-0"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange rounded-full"></div>
                  <span className="font-regular text-orange-dark">
                    {item.action}
                  </span>
                </div>
                <span className="text-sm text-gray-slate font-light">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Section */}
      <Card
        title="System Performance"
        description="Monitor your application metrics"
      >
        <PerformanceChart />
      </Card>
    </div>
    </ProtectedRoute>
  );
}
