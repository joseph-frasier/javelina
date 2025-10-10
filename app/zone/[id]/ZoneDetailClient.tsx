'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { EnvironmentBadge } from '@/components/ui/EnvironmentBadge';
import Dropdown from '@/components/ui/Dropdown';
import { OrganizationDetail, EnvironmentDetail } from '@/lib/mock-hierarchy-data';

interface ZoneDetailClientProps {
  zone: any;
  zoneId: string;
  organization?: OrganizationDetail | null;
  environment?: EnvironmentDetail | null;
}

export function ZoneDetailClient({ zone, zoneId, organization, environment }: ZoneDetailClientProps) {
  const [queryType, setQueryType] = useState('A');
  const [queryName, setQueryName] = useState(zone.name);
  const [simulatorResult, setSimulatorResult] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editedZone, setEditedZone] = useState({
    ttl: zone.ttl,
    nameservers: zone.nameservers.join(', '),
    adminEmail: zone.soa.email,
  });

  const handleRunQuery = () => {
    // Simulate DNS query
    setSimulatorResult({
      query: `${queryName} ${queryType}`,
      status: 'NOERROR',
      answers: queryType === 'A' ? ['192.0.2.1'] : queryType === 'AAAA' ? ['2001:db8::1'] : ['acme.com'],
      time: Math.floor(Math.random() * 20 + 5),
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  const handleSaveZone = () => {
    // Mock save - in real app, this would call an API
    alert('Zone updated successfully! (Mock operation)');
    setShowEditModal(false);
  };

  const handleDeleteZone = () => {
    // Mock delete - in real app, this would call an API
    alert(`Zone ${zone.name} deleted successfully! (Mock operation)\nIn a real app, you would be redirected to the zones list.`);
    setShowDeleteModal(false);
  };

  const recordsByType = zone.records.reduce((acc: any, record: any) => {
    acc[record.type] = (acc[record.type] || 0) + 1;
    return acc;
  }, {});

  // Build breadcrumb items
  const breadcrumbItems = [];
  if (organization && environment) {
    breadcrumbItems.push(
      { label: organization.name, href: `/organization/${organization.id}` },
      { label: environment.name, href: `/organization/${organization.id}/environment/${environment.id}` },
      { label: zone.name }
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      {breadcrumbItems.length > 0 && (
        <Breadcrumb items={breadcrumbItems} className="mb-6" />
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold text-orange-dark">{zone.name}</h1>
            {environment && <EnvironmentBadge type={environment.environment_type} />}
          </div>
          <p className="text-gray-slate">
            Zone management and analytics
            {organization && environment && ` • ${organization.name} → ${environment.name}`}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            Active
          </span>
          <Button variant="secondary" onClick={() => setShowEditModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Button>
          <Button variant="secondary" onClick={() => setShowDeleteModal(true)} className="!bg-red-600 hover:!bg-red-700 !text-white">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </Button>
          <Button variant="primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reload
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card title="Queries (24h)" className="p-6">
          <p className="text-3xl font-bold text-orange">{zone.queryStats.last24h.toLocaleString()}</p>
          <p className="text-sm text-gray-slate mt-1">{zone.queryStats.qps} QPS average</p>
        </Card>
        <Card title="Success Rate" className="p-6">
          <p className="text-3xl font-bold text-orange">{zone.queryStats.successRate}%</p>
          <p className="text-sm text-gray-slate mt-1">Last 24 hours</p>
        </Card>
        <Card title="Avg Response" className="p-6">
          <p className="text-3xl font-bold text-orange">{zone.queryStats.avgResponseTime}ms</p>
          <p className="text-sm text-gray-slate mt-1">Response time</p>
        </Card>
        <Card title="Total Records" className="p-6">
          <p className="text-3xl font-bold text-orange">{zone.records.length}</p>
          <p className="text-sm text-gray-slate mt-1">{Object.keys(recordsByType).length} record types</p>
        </Card>
      </div>

      {/* Zone Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card title="Zone Information" className="p-6">
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-light">
              <span className="text-gray-slate">Serial Number</span>
              <span className="font-medium text-orange-dark">{zone.serial}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-light">
              <span className="text-gray-slate">Last Updated</span>
              <span className="font-medium text-orange-dark">{zone.lastUpdated}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-light">
              <span className="text-gray-slate">Default TTL</span>
              <span className="font-medium text-orange-dark">{zone.ttl}s</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-slate">Nameservers</span>
              <span className="font-medium text-orange-dark">{zone.nameservers.join(', ')}</span>
            </div>
          </div>
        </Card>

        <Card title="SOA Record" className="p-6">
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-light">
              <span className="text-gray-slate">Primary NS</span>
              <span className="font-medium text-orange-dark">{zone.soa.primary}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-light">
              <span className="text-gray-slate">Admin Email</span>
              <span className="font-medium text-orange-dark">{zone.soa.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-light">
              <span className="text-gray-slate">Refresh</span>
              <span className="font-medium text-orange-dark">{zone.soa.refresh}s</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-slate">Retry / Expire</span>
              <span className="font-medium text-orange-dark">{zone.soa.retry}s / {zone.soa.expire}s</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Query Type Breakdown */}
      <Card title="Query Type Distribution" className="p-6 mb-8">
        <div className="space-y-3">
          {zone.queryTypes.map((item: any) => (
            <div key={item.type} className="flex items-center">
              <span className="w-16 text-sm font-medium text-gray-slate">{item.type}</span>
              <div className="flex-1 mx-4">
                <div className="bg-gray-light rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-orange h-full flex items-center justify-end px-2"
                    style={{ width: `${item.percentage}%` }}
                  >
                    <span className="text-xs text-white font-medium">{item.percentage}%</span>
                  </div>
                </div>
              </div>
              <span className="w-24 text-sm text-gray-slate text-right">{item.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* DNS Records Table */}
      <Card title="DNS Records" className="p-6 mb-8">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-light">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-slate">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-slate">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-slate">Value</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-slate">TTL</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-slate">Status</th>
              </tr>
            </thead>
            <tbody>
              {zone.records.map((record: any) => (
                <tr key={record.id} className="border-b border-gray-light hover:bg-gray-light transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-orange-dark">{record.name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-blue-electric/10 text-blue-electric rounded text-xs font-medium">
                      {record.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-slate font-mono">{record.value}</td>
                  <td className="py-3 px-4 text-sm text-gray-slate">{record.ttl}s</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Query Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card title="DNS Query Simulator" className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-slate mb-2">Query Name</label>
              <input
                type="text"
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-light rounded-md focus:outline-none focus:ring-2 focus:ring-orange"
              />
            </div>
            <div>
              <Dropdown
                label="Record Type"
                value={queryType}
                onChange={setQueryType}
                options={[
                  { value: 'A', label: 'A' },
                  { value: 'AAAA', label: 'AAAA' },
                  { value: 'CNAME', label: 'CNAME' },
                  { value: 'MX', label: 'MX' },
                  { value: 'TXT', label: 'TXT' },
                ]}
              />
            </div>
            <Button variant="primary" className="w-full" onClick={handleRunQuery}>
              Run Query
            </Button>

            {simulatorResult && (
              <div className="mt-4 p-4 bg-orange-dark/5 rounded-md border border-orange/20">
                <p className="text-sm font-medium text-orange-dark mb-2">Query Result:</p>
                <div className="space-y-1 text-sm font-mono">
                  <p className="text-gray-slate">;; QUERY: {simulatorResult.query}</p>
                  <p className="text-gray-slate">;; STATUS: {simulatorResult.status}</p>
                  <p className="text-gray-slate">;; ANSWERS:</p>
                  {simulatorResult.answers.map((answer: string, i: number) => (
                    <p key={i} className="text-orange-dark ml-4">{answer}</p>
                  ))}
                  <p className="text-gray-slate mt-2">;; Query time: {simulatorResult.time}ms</p>
                  <p className="text-gray-slate">;; SERVER: ns1.{zone.name}</p>
                  <p className="text-gray-slate">;; WHEN: {simulatorResult.timestamp}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="Recent Queries" className="p-6">
          <div className="space-y-2">
            {zone.recentQueries.map((query: any, index: number) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-light last:border-0">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono text-gray-slate">{query.timestamp}</span>
                  <span className="px-2 py-1 bg-blue-electric/10 text-blue-electric rounded text-xs font-medium">
                    {query.type}
                  </span>
                  <span className="text-sm text-orange-dark font-medium">{query.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-green-600 font-medium">{query.response}</span>
                  <span className="text-xs text-gray-slate">{query.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Edit Zone Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-slate rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-light">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-orange-dark">Edit Zone: {zone.name}</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-slate hover:text-orange-dark"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-slate mb-2">
                  Zone Name
                </label>
                <input
                  type="text"
                  value={zone.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-light rounded-md bg-gray-light/50 text-gray-slate cursor-not-allowed"
                />
                <p className="text-xs text-gray-slate mt-1">Zone name cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-slate mb-2">
                  Default TTL (seconds)
                </label>
                <input
                  type="number"
                  value={editedZone.ttl}
                  onChange={(e) => setEditedZone({ ...editedZone, ttl: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-light rounded-md focus:outline-none focus:ring-2 focus:ring-orange text-gray-slate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-slate mb-2">
                  Nameservers (comma-separated)
                </label>
                <input
                  type="text"
                  value={editedZone.nameservers}
                  onChange={(e) => setEditedZone({ ...editedZone, nameservers: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-light rounded-md focus:outline-none focus:ring-2 focus:ring-orange text-gray-slate"
                  placeholder="ns1.example.com, ns2.example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-slate mb-2">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={editedZone.adminEmail}
                  onChange={(e) => setEditedZone({ ...editedZone, adminEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-light rounded-md focus:outline-none focus:ring-2 focus:ring-orange text-gray-slate"
                  placeholder="admin@example.com"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-blue-800 font-medium">Note:</p>
                    <p className="text-sm text-blue-700 mt-1">
                      This is a mock operation. In a production environment, changes would be validated and applied to your DNS infrastructure.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-light flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveZone}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Zone Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-slate rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-orange-dark text-center mb-2">
                Delete Zone
              </h2>
              <p className="text-gray-slate text-center mb-6">
                Are you sure you want to delete <span className="font-bold text-orange-dark">{zone.name}</span>?
                This action cannot be undone and will delete all {zone.records.length} DNS records.
              </p>

              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-medium">Warning</p>
                    <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                      <li>All DNS records will be permanently deleted</li>
                      <li>Zone cannot be recovered after deletion</li>
                      <li>This is a mock operation for demonstration</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleDeleteZone}
                >
                  Delete Zone
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
