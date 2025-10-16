'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createOrganization, softDeleteOrganization } from '@/lib/actions/admin/organizations';
import { useToastStore } from '@/lib/toast-store';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  deleted_at?: string;
  organization_members?: Array<{ organization_id: string }>;
}

export default function AdminOrganizationsPage() {
  const { addToast } = useToastStore();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'deleted' | 'all'>('active');
  const [actioningOrgId, setActioningOrgId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    filterOrganizations();
  }, [orgs, searchName, statusFilter]);

  const fetchOrganizations = async () => {
    try {
      const client = createServiceRoleClient();
      const { data, error } = await client
        .from('organizations')
        .select('*, organization_members(organization_id)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrgs((data || []) as Organization[]);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      addToast('error', 'Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  const filterOrganizations = () => {
    let filtered = orgs;

    if (searchName) {
      filtered = filtered.filter((org) =>
        org.name.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter((org) => !org.deleted_at);
    } else if (statusFilter === 'deleted') {
      filtered = filtered.filter((org) => org.deleted_at);
    }

    setFilteredOrgs(filtered);
  };

  const handleCreateOrganization = async () => {
    if (!createName.trim()) {
      addToast('error', 'Organization name is required');
      return;
    }

    setIsCreating(true);
    try {
      const result = await createOrganization(createName, createDescription);
      if (result.error) {
        addToast('error', result.error);
      } else {
        addToast('success', 'Organization created successfully');
        setCreateName('');
        setCreateDescription('');
        setShowCreateForm(false);
        await fetchOrganizations();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleSoftDeleteOrganization = async (orgId: string) => {
    if (!confirm('Are you sure you want to delete this organization? This action can be undone.')) {
      return;
    }

    setActioningOrgId(orgId);
    try {
      const result = await softDeleteOrganization(orgId);
      if (result.error) {
        addToast('error', result.error);
      } else {
        addToast('success', 'Organization deleted successfully');
        setOrgs((prevOrgs) =>
          prevOrgs.map((org) =>
            org.id === orgId ? { ...org, deleted_at: new Date().toISOString() } : org
          )
        );
      }
    } finally {
      setActioningOrgId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMemberCount = (org: Organization) => org.organization_members?.length || 0;

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-orange-dark">Organizations</h1>
              <p className="text-gray-slate mt-2">Manage all organizations</p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : '+ Create Organization'}
            </Button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <Card className="p-6 bg-orange-50">
              <h2 className="text-lg font-semibold text-orange-dark mb-4">Create New Organization</h2>
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Organization name..."
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Description (optional)..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    disabled={isCreating}
                    onClick={handleCreateOrganization}
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateName('');
                      setCreateDescription('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Filters */}
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="Search by organization name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 pr-8 border border-gray-light rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition-all duration-150 appearance-none cursor-pointer hover:border-gray-300"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23456173' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center'
                  }}
                >
                  <option value="all">All Organizations</option>
                  <option value="active">Active Only</option>
                  <option value="deleted">Deleted Only</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Organizations Table */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-orange-dark mb-4">Organizations List</h2>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-slate">Loading organizations...</p>
              </div>
            ) : filteredOrgs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-slate">No organizations found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-light">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900">Members</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Created</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrgs.map((org) => (
                      <tr key={org.id} className="border-b border-gray-light hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{org.name}</p>
                          {org.description && (
                            <p className="text-sm text-gray-slate">{org.description}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <p className="text-sm text-gray-900">{getMemberCount(org)}</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                              org.deleted_at
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {org.deleted_at ? 'Deleted' : 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-slate">{formatDate(org.created_at)}</p>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <Link href={`/admin/organizations/${org.id}`}>
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                          </Link>
                          {!org.deleted_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="!text-red-600 hover:!bg-red-50"
                              disabled={actioningOrgId === org.id}
                              onClick={() => handleSoftDeleteOrganization(org.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Summary */}
          {!loading && (
            <p className="text-sm text-gray-slate">
              Showing {filteredOrgs.length} of {orgs.length} organizations
            </p>
          )}
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
