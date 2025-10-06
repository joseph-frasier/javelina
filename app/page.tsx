import { StatCard, Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function DashboardPage() {
  return (
    <div className="p-8">
      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="font-black font-sans text-4xl text-orange-dark mb-2">
          Innovate. Connect. Empower.
        </h1>
        <p className="font-light text-gray-slate text-lg">
          Welcome back to your Javelina dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
            title="Total Users"
            value="2,345"
            change="+12% from last month"
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            }
          />

          <StatCard
            title="Active Sessions"
            value="892"
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

          <StatCard
            title="Revenue"
            value="$45.2K"
            change="+18% from last month"
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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />

          <StatCard
            title="Conversion Rate"
            value="3.24%"
            change="-2.1% from last week"
            changeType="negative"
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
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
          <div className="space-y-3 mt-4">
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create New Project
            </Button>
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              View Reports
            </Button>
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
                action: 'New user registered',
                time: '5 minutes ago',
                type: 'user',
              },
              {
                action: 'System update completed',
                time: '1 hour ago',
                type: 'system',
              },
              {
                action: 'Payment received',
                time: '2 hours ago',
                type: 'payment',
              },
              {
                action: 'New feature deployed',
                time: 'Yesterday',
                type: 'deploy',
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
        <div className="mt-6 h-64 bg-orange-light rounded-lg flex items-center justify-center">
          <p className="text-gray-slate font-light">
            Chart component placeholder - integrate your preferred charting
            library
          </p>
        </div>
      </Card>
    </div>
  );
}
