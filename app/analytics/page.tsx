'use client';

import { useState, useEffect } from 'react';
import { StatCard, Card } from '@/components/ui/Card';
import Dropdown from '@/components/ui/Dropdown';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { createClient } from '@/lib/supabase/client';
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

// Mock data - commented out, will be replaced with real DNS query logging
// const trafficData = [
//   { date: '2025-10-01', queries: 20104, errors: 42 },
//   { date: '2025-10-02', queries: 21356, errors: 55 },
//   { date: '2025-10-03', queries: 19980, errors: 61 },
//   { date: '2025-10-04', queries: 24550, errors: 50 },
//   { date: '2025-10-05', queries: 22987, errors: 38 },
//   { date: '2025-10-06', queries: 25327, errors: 65 },
// ];

// const topDomains = [
//   { domain: 'api.acme.com', queries: 18400, percent: '12%' },
//   { domain: 'mail.acme.com', queries: 13900, percent: '9%' },
//   { domain: 'dev.javelina.io', queries: 9300, percent: '6%' },
//   { domain: 'staging.javelina.io', queries: 8750, percent: '6%' },
//   { domain: 'cdn.acme.com', queries: 6410, percent: '4%' },
// ];

// const queryTypes = [
//   { name: 'A', value: 45, color: '#EF7215' },
//   { name: 'AAAA', value: 20, color: '#00B0FF' },
//   { name: 'MX', value: 15, color: '#00796B' },
//   { name: 'TXT', value: 10, color: '#456173' },
//   { name: 'CNAME', value: 10, color: '#D9D9D9' },
// ];

// const errorData = [
//   { error_type: 'NXDOMAIN', count: 287, zones: 12 },
//   { error_type: 'SERVFAIL', count: 145, zones: 6 },
//   { error_type: 'REFUSED', count: 38, zones: 2 },
// ];

interface Organization {
  id: string;
  name: string;
}

interface Environment {
  id: string;
  name: string;
  organization_id: string;
}

interface Zone {
  id: string;
  name: string;
  environment_id: string;
}

export default function AnalyticsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [selectedEnvironment, setSelectedEnvironment] = useState('all');
  const [selectedZone, setSelectedZone] = useState('all');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id, organizations(id, name)')
        .eq('user_id', user.id);

      const orgs = memberships?.map(m => ({
        id: (m.organizations as any).id,
        name: (m.organizations as any).name,
      })) || [];

      setOrganizations(orgs);
    };

    fetchOrganizations();
  }, []);

  // Fetch environments when organization changes
  useEffect(() => {
    const fetchEnvironments = async () => {
      const supabase = createClient();
      if (selectedOrg === 'all') {
        // Fetch all environments from all user's orgs
        const orgIds = organizations.map(o => o.id);
        if (orgIds.length === 0) return;

        const { data } = await supabase
          .from('environments')
          .select('id, name, organization_id')
          .in('organization_id', orgIds)
          .order('name');

        setEnvironments(data || []);
      } else {
        // Fetch environments for selected org
        const { data } = await supabase
          .from('environments')
          .select('id, name, organization_id')
          .eq('organization_id', selectedOrg)
          .order('name');

        setEnvironments(data || []);
      }
      
      // Reset environment and zone selection
      setSelectedEnvironment('all');
      setSelectedZone('all');
    };

    if (organizations.length > 0) {
      fetchEnvironments();
    }
  }, [selectedOrg, organizations]);

  // Fetch zones when environment changes
  useEffect(() => {
    const fetchZones = async () => {
      const supabase = createClient();
      if (selectedEnvironment === 'all') {
        // Fetch all zones from filtered environments
        const envIds = environments.map(e => e.id);
        if (envIds.length === 0) return;

        const { data } = await supabase
          .from('zones')
          .select('id, name, environment_id')
          .in('environment_id', envIds)
          .order('name');

        setZones(data || []);
      } else {
        // Fetch zones for selected environment
        const { data } = await supabase
          .from('zones')
          .select('id, name, environment_id')
          .eq('environment_id', selectedEnvironment)
          .order('name');

        setZones(data || []);
      }
      
      // Reset zone selection
      setSelectedZone('all');
    };

    if (environments.length > 0) {
      fetchZones();
    }
  }, [selectedEnvironment, environments]);

  // Set mounted state on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ProtectedRoute>
      <>
      <style jsx global>{`
        svg, svg * {
          outline: none !important;
        }
      `}</style>
      <div className="max-w-[1600px] 2xl:max-w-[1900px] 3xl:max-w-full mx-auto px-4 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="font-black text-2xl sm:text-3xl md:text-4xl text-orange-dark dark:text-orange mb-2">
            DNS Analytics
          </h1>
          <p className="font-light text-gray-slate dark:text-gray-300 text-sm sm:text-base">
            Monitor DNS activity and performance across all zones
          </p>
        </div>

        {/* Filters Section */}
        <Card className="mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Organization Filter */}
            <Dropdown
              label="Organization"
              value={selectedOrg}
              onChange={setSelectedOrg}
              options={[
                { value: 'all', label: 'All Organizations' },
                ...organizations.map(org => ({
                  value: org.id,
                  label: org.name,
                })),
              ]}
            />

            {/* Environment Filter */}
            <Dropdown
              label="Environment"
              value={selectedEnvironment}
              onChange={setSelectedEnvironment}
              options={[
                { value: 'all', label: 'All Environments' },
                ...environments.map(env => ({
                  value: env.id,
                  label: env.name,
                })),
              ]}
            />

            {/* Zone Filter */}
            <Dropdown
              label="Zone"
              value={selectedZone}
              onChange={setSelectedZone}
              options={[
                { value: 'all', label: 'All Zones' },
                ...zones.map(zone => ({
                  value: zone.id,
                  label: zone.name,
                })),
              ]}
            />

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-orange-dark dark:text-orange mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange text-orange-dark dark:text-gray-100"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-orange-dark dark:text-orange mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange text-orange-dark dark:text-gray-100"
              />
            </div>
          </div>

          {/* Last Refresh */}
          <div className="mt-4 text-xs sm:text-sm text-gray-slate dark:text-gray-400 font-light">
            Last refreshed: {isMounted ? lastRefresh.toLocaleTimeString() : '--'}
          </div>
        </Card>

        {/* Overview Metrics - Commented out until DNS query logging is implemented */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
        </div> */}

        {/* Traffic Over Time Chart */}
        <Card title="Traffic Over Time" description="DNS query volume" className="mb-6 sm:mb-8">
          <div className="mt-4 sm:mt-6 h-64 sm:h-80 flex items-center justify-center">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                No query data available
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                DNS query logging will be available once implemented
              </p>
            </div>
          </div>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Top Queried Domains */}
          <Card
            title="Top Queried Domains"
            description="Most frequently queried domains"
          >
            <div className="mt-4 py-12 flex items-center justify-center">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  No domain data available
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Query statistics will appear once DNS logging is enabled
                </p>
              </div>
            </div>
          </Card>

          {/* Query Types Distribution */}
          <Card
            title="Query Types Distribution"
            description="DNS record types breakdown"
          >
            <div className="mt-4 py-12 flex items-center justify-center">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  No query type data available
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Record type distribution will appear once DNS logging is enabled
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Error Breakdown */}
        <Card
          title="Error Breakdown"
          description="DNS errors by type and affected zones"
        >
          <div className="mt-4 py-12 flex items-center justify-center">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                No error data available
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                DNS error tracking will appear once logging is enabled
              </p>
            </div>
          </div>
        </Card>
      </div>
      </>
    </ProtectedRoute>
  );
}
