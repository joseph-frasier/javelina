'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Tooltip, InfoIcon } from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createOrganization, softDeleteOrganization } from '@/lib/actions/admin/organizations';
import { useToastStore } from '@/lib/toast-store';
import { formatDateWithRelative } from '@/lib/utils/time';
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
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger',
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    filterOrganizations();
  }, [orgs, searchName, statusFilter]);

  const fetchOrganizations = async () => {
    try {
      const client = createServiceRoleClient();
      
      // If no client (development mode without backend), just show empty data
      if (!client) {
        setOrgs([]);
        setLoading(false);
        return;
      }
      
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

  const confirmDeleteOrganization = (orgId: string, orgName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Organization',
      message: `Are you sure you want to delete "${orgName}"? All members will lose access to this organization. This action can be undone by an administrator.`,
      variant: 'danger',
      onConfirm: () => handleSoftDeleteOrganization(orgId),
    });
  };

  const handleSoftDeleteOrganization = async (orgId: string) => {
    setActioningOrgId(orgId);
    setConfirmModal({ ...confirmModal, isOpen: false });
    
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

  // Calculate stats
  const stats = {
    total: orgs.length,
    active: orgs.filter((o) => !o.deleted_at).length,
    deleted: orgs.filter((o) => o.deleted_at).length,
  };

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-orange-dark dark:text-orange">Organizations</h1>
              <p className="text-gray-slate mt-2">Manage all organizations</p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : '+ Create Organization'}
            </Button>
          </div>

          {/* Stat Cards */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                label="Total Organizations"
                value={stats.total}
                color="blue"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
              />
              <StatCard
                label="Active"
                value={stats.active}
                color="green"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                label="Deleted"
                value={stats.deleted}
                color="red"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                }
              />
            </div>
          )}

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
              <Dropdown
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as any)}
                options={[
                  { value: 'all', label: 'All Organizations' },
                  { value: 'active', label: 'Active Only' },
                  { value: 'deleted', label: 'Deleted Only' }
                ]}
              />
            </div>
          </Card>

          {/* Organizations Table */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-orange-dark dark:text-orange">Organizations List</h2>
              <Tooltip content="User groups">
                <InfoIcon />
              </Tooltip>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
                <p className="text-gray-slate mt-4">Loading organizations...</p>
              </div>
            ) : filteredOrgs.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-gray-slate text-lg font-medium">No organizations found</p>
                <p className="text-gray-400 text-sm mt-2">
                  {searchName || statusFilter !== 'active' 
                    ? 'Try adjusting your filters to see more results.'
                    : 'Click "Create Organization" above to get started.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-light">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Name</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                        <div className="flex items-center justify-center gap-1">
                          Members
                          <Tooltip content="Member count">
                            <InfoIcon />
                          </Tooltip>
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                        <div className="flex items-center justify-center gap-1">
                          Status
                          <Tooltip content="Organization status">
                            <InfoIcon />
                          </Tooltip>
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Created</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrgs.map((org) => {
                      const createdDate = formatDateWithRelative(org.created_at);
                      return (
                        <tr key={org.id} className="border-b border-gray-light hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{org.name}</p>
                            {org.description && (
                              <p className="text-sm text-gray-slate dark:text-gray-400">{org.description}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <p className="text-sm text-gray-900 dark:text-gray-100">{getMemberCount(org)}</p>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                                org.deleted_at
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                org.deleted_at ? 'bg-red-600' : 'bg-green-600'
                              }`} />
                              {org.deleted_at ? 'Deleted' : 'Active'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Tooltip content={createdDate.absolute}>
                              <p className="text-sm text-gray-slate dark:text-gray-400 cursor-help">
                                {createdDate.relative}
                              </p>
                            </Tooltip>
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
                                className="!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-900/20"
                                disabled={actioningOrgId === org.id}
                                onClick={() => confirmDeleteOrganization(org.id, org.name)}
                              >
                                Delete
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Summary */}
          {!loading && (
            <p className="text-sm text-gray-slate dark:text-gray-400">
              Showing {filteredOrgs.length} of {orgs.length} organizations
            </p>
          )}
        </div>

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
          isLoading={actioningOrgId !== null}
        />
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
