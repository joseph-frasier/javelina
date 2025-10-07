'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { StatCard, Card } from '@/components/ui/Card';
import Dropdown from '@/components/ui/Dropdown';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Mock data
const trafficData = [
  { date: '2025-10-01', queries: 20104, errors: 42 },
  { date: '2025-10-02', queries: 21356, errors: 55 },
  { date: '2025-10-03', queries: 19980, errors: 61 },
  { date: '2025-10-04', queries: 24550, errors: 50 },
  { date: '2025-10-05', queries: 22987, errors: 38 },
  { date: '2025-10-06', queries: 25327, errors: 65 },
];

const topDomains = [
  { domain: 'api.acme.com', queries: 18400, percent: '12%' },
  { domain: 'mail.acme.com', queries: 13900, percent: '9%' },
  { domain: 'dev.javelina.io', queries: 9300, percent: '6%' },
  { domain: 'staging.javelina.io', queries: 8750, percent: '6%' },
  { domain: 'cdn.acme.com', queries: 6410, percent: '4%' },
];

const queryTypes = [
  { name: 'A', value: 45, color: '#EF7215' },
  { name: 'AAAA', value: 20, color: '#00B0FF' },
  { name: 'MX', value: 15, color: '#00796B' },
  { name: 'TXT', value: 10, color: '#456173' },
  { name: 'CNAME', value: 10, color: '#D9D9D9' },
];

const errorData = [
  { error_type: 'NXDOMAIN', count: 287, zones: 12 },
  { error_type: 'SERVFAIL', count: 145, zones: 6 },
  { error_type: 'REFUSED', count: 38, zones: 2 },
];

export default function AnalyticsPage() {
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedZone, setSelectedZone] = useState('all');
  const [startDate, setStartDate] = useState('2025-10-01');
  const [endDate, setEndDate] = useState('2025-10-06');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-orange-light">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="font-black text-4xl text-orange-dark mb-2">
            DNS Analytics
          </h1>
          <p className="font-light text-gray-slate text-base">
            Monitor DNS activity and performance across all zones
          </p>
        </div>

        {/* Filters Section */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Organization Filter */}
            <Dropdown
              label="Organization"
              value={selectedOrg}
              onChange={setSelectedOrg}
              options={[
                { value: 'all', label: 'All Organizations' },
                { value: 'acme', label: 'Acme Corp' },
                { value: 'javelina', label: 'Javelina Inc' },
              ]}
            />

            {/* Project Filter */}
            <Dropdown
              label="Project"
              value={selectedProject}
              onChange={setSelectedProject}
              options={[
                { value: 'all', label: 'All Projects' },
                { value: 'prod', label: 'Production' },
                { value: 'staging', label: 'Staging' },
                { value: 'dev', label: 'Development' },
              ]}
            />

            {/* Zone Filter */}
            <Dropdown
              label="Zone"
              value={selectedZone}
              onChange={setSelectedZone}
              options={[
                { value: 'all', label: 'All Zones' },
                { value: 'acme.com', label: 'acme.com' },
                { value: 'javelina.io', label: 'javelina.io' },
              ]}
            />

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-orange-dark mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-gray-light focus:outline-none focus:ring-2 focus:ring-orange text-orange-dark"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-orange-dark mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-gray-light focus:outline-none focus:ring-2 focus:ring-orange text-orange-dark"
              />
            </div>
          </div>

          {/* Last Refresh */}
          <div className="mt-4 text-sm text-gray-slate font-light">
            Last refreshed: {lastRefresh.toLocaleTimeString()}
          </div>
        </Card>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Queries (24h)"
            value="152,304"
            change="+8.3% from yesterday"
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
          />

          <StatCard
            title="Unique Domains"
            value="238"
            change="+12 from yesterday"
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
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
            }
          />

          <StatCard
            title="Error Rate"
            value="0.34%"
            change="-0.12% from yesterday"
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            }
          />

          <StatCard
            title="Avg Query Latency"
            value="41ms"
            change="-3ms from yesterday"
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

        {/* Traffic Over Time Chart */}
        <Card title="Traffic Over Time" description="DNS query volume" className="mb-8">
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D9D9D9" />
                <XAxis
                  dataKey="date"
                  stroke="#456173"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#456173" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #D9D9D9',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="queries"
                  stroke="#EF7215"
                  strokeWidth={2}
                  name="Queries"
                />
                <Line
                  type="monotone"
                  dataKey="errors"
                  stroke="#ff0000"
                  strokeWidth={2}
                  name="Errors"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Queried Domains */}
          <Card
            title="Top Queried Domains"
            description="Most frequently queried domains"
          >
            <div className="mt-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-light">
                      <th className="text-left py-3 px-2 font-bold text-sm text-orange-dark">
                        Domain
                      </th>
                      <th className="text-right py-3 px-2 font-bold text-sm text-orange-dark">
                        Queries
                      </th>
                      <th className="text-right py-3 px-2 font-bold text-sm text-orange-dark">
                        % of Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDomains.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-light last:border-0 hover:bg-orange-light transition-colors"
                      >
                        <td className="py-3 px-2 font-regular text-orange-dark">
                          {item.domain}
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-orange-dark">
                          {item.queries.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-blue-electric">
                          {item.percent}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Query Types Distribution */}
          <Card
            title="Query Types Distribution"
            description="DNS record types breakdown"
          >
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={queryTypes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={1}
                    activeShape={{
                      stroke: '#EF7215',
                      strokeWidth: 3,
                    }}
                  >
                    {queryTypes.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        style={{ 
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Error Breakdown */}
        <Card
          title="Error Breakdown"
          description="DNS errors by type and affected zones"
        >
          <div className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-light">
                    <th className="text-left py-3 px-2 font-bold text-sm text-orange-dark">
                      Error Type
                    </th>
                    <th className="text-right py-3 px-2 font-bold text-sm text-orange-dark">
                      Count
                    </th>
                    <th className="text-right py-3 px-2 font-bold text-sm text-orange-dark">
                      Affected Zones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {errorData.map((item, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-light last:border-0 hover:bg-orange-light transition-colors"
                    >
                      <td className="py-3 px-2 font-regular text-orange-dark">
                        {item.error_type}
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-red-500">
                        {item.count}
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-gray-slate">
                        {item.zones}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
