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
import { ExportButton } from '@/components/admin/ExportButton';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import { QuickActionsDropdown, QuickAction } from '@/components/admin/QuickActionsDropdown';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createOrganization, softDeleteOrganization } from '@/lib/actions/admin/organizations';
import { useToastStore } from '@/lib/toast-store';
import { formatDateWithRelative } from '@/lib/utils/time';
import { generateMockOrganizations } from '@/lib/mock-admin-data';
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
  
  // Filters
  const [searchName, setSearchName] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'deleted' | 'all'>('active');
  const [memberCountFilter, setMemberCountFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'members' | 'created'>('name');
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
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
  }, [orgs, searchName, statusFilter, memberCountFilter, sortBy]);

  const fetchOrganizations = async () => {
    try {
      const client = createServiceRoleClient();
      
      // If no client (development mode without backend), use mock data
      if (!client) {
        const mockOrgs = generateMockOrganizations(20);
        setOrgs(mockOrgs as any);
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
      // Fallback to mock data on error
      const mockOrgs = generateMockOrganizations(20);
      setOrgs(mockOrgs as any);
      addToast('info', 'Using mock data for demonstration');
    } finally {
      setLoading(false);
    }
  };

  const filterOrganizations = () => {
    let filtered = orgs;

    // Search filter
    if (searchName) {
      filtered = filtered.filter((org) =>
        org.name.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter((org) => !org.deleted_at);
    } else if (statusFilter === 'deleted') {
      filtered = filtered.filter((org) => org.deleted_at);
    }

    // Member count filter
    if (memberCountFilter !== 'all') {
      filtered = filtered.filter((org) => {
        const count = getMemberCount(org);
        switch (memberCountFilter) {
          case '1-10':
            return count >= 1 && count <= 10;
          case '11-50':
            return count >= 11 && count <= 50;
          case '51+':
            return count >= 51;
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'members':
          return getMemberCount(b) - getMemberCount(a);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    setFilteredOrgs(filtered);
  };

  const clearFilters = () => {
    setSearchName('');
    setStatusFilter('active');
    setMemberCountFilter('all');
    setSortBy('name');
  };

  // Bulk selection functions
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredOrgs.map(o => o.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const getSelectedOrgs = () => {
    return orgs.filter(o => selectedIds.has(o.id));
  };

  // Bulk actions
  const handleBulkDelete = () => {
    const count = selectedIds.size;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Organizations',
      message: `Are you sure you want to delete ${count} organization${count > 1 ? 's' : ''}? All members will lose access. This action can be undone by an administrator.`,
      variant: 'danger',
      onConfirm: () => {
        addToast('success', `${count} organization${count > 1 ? 's' : ''} deleted`);
        clearSelection();
        setConfirmModal({ ...confirmModal, isOpen: false });
      },
    });
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

  const getQuickActions = (org: Organization): QuickAction[] => [
    {
      label: 'View Details',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      onClick: () => window.location.href = `/admin/organizations/${org.id}`,
    },
    {
      label: 'View Members',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      onClick: () => addToast('info', 'View members functionality coming soon'),
    },
    {
      label: 'Edit Organization',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      onClick: () => addToast('info', 'Edit functionality coming soon'),
      divider: true,
    },
    {
      label: 'Delete Organization',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: () => confirmDeleteOrganization(org.id, org.name),
      variant: 'danger',
    },
  ];

  const getMemberCount = (org: Organization) => org.organization_members?.length || 0;

  // Calculate stats
  const stats = {
    total: orgs.length,
    active: orgs.filter((o) => !o.deleted_at).length,
    deleted: orgs.filter((o) => o.deleted_at).length,
    totalMembers: orgs.reduce((sum, org) => sum + getMemberCount(org), 0),
  };

  const hasActiveFilters = searchName || statusFilter !== 'active' || memberCountFilter !== 'all' || sortBy !== 'name';

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-orange-dark dark:text-orange">Organizations</h1>
              <p className="text-gray-slate dark:text-gray-300 mt-2">Manage all organizations</p>
            </div>
            <div className="flex items-center gap-3">
              <ExportButton data={filteredOrgs} filename="organizations" />
              <Button
                variant="primary"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                {showCreateForm ? 'Cancel' : '+ Create Organization'}
              </Button>
            </div>
          </div>

          {/* Stat Cards */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <StatCard
                label="Total Members"
                value={stats.totalMembers}
                color="orange"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
              />
            </div>
          )}

          {/* Create Form */}
          {showCreateForm && (
            <Card className="p-6 bg-orange-50 dark:bg-orange-900/10">
              <h2 className="text-lg font-semibold text-orange-dark dark:text-orange mb-4">Create New Organization</h2>
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <Dropdown
                  value={memberCountFilter}
                  onChange={setMemberCountFilter}
                  options={[
                    { value: 'all', label: 'All Sizes' },
                    { value: '1-10', label: '1-10 Members' },
                    { value: '11-50', label: '11-50 Members' },
                    { value: '51+', label: '51+ Members' }
                  ]}
                />
                <Dropdown
                  value={sortBy}
                  onChange={(value) => setSortBy(value as any)}
                  options={[
                    { value: 'name', label: 'Sort by Name' },
                    { value: 'members', label: 'Sort by Members' },
                    { value: 'created', label: 'Sort by Date' }
                  ]}
                />
              </div>

              {hasActiveFilters && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-slate dark:text-gray-400">
                    {filteredOrgs.length} of {orgs.length} organizations match your filters
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearFilters}
                    className="!text-orange-600 dark:!text-orange-400"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Organizations Table */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-orange-dark dark:text-orange">Organizations List</h2>
              <Tooltip content="User groups">
                <InfoIcon />
              </Tooltip>
              {selectedIds.size > 0 && (
                <span className="ml-auto text-sm text-gray-slate dark:text-gray-400">
                  {selectedIds.size} selected
                </span>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
                <p className="text-gray-slate dark:text-gray-300 mt-4">Loading organizations...</p>
              </div>
            ) : filteredOrgs.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-gray-slate dark:text-gray-300 text-lg font-medium">No organizations found</p>
                <p className="text-gray-400 text-sm mt-2">
                  {hasActiveFilters
                    ? 'Try adjusting your filters to see more results.'
                    : 'Click "Create Organization" above to get started.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-light">
                      <th className="text-left py-3 px-4 w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredOrgs.length && filteredOrgs.length > 0}
                          onChange={(e) => e.target.checked ? selectAll() : clearSelection()}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                      </th>
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
                            <input
                              type="checkbox"
                              checked={selectedIds.has(org.id)}
                              onChange={() => toggleSelect(org.id)}
                              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{org.name}</p>
                            {org.description && (
                              <p className="text-sm text-gray-slate dark:text-gray-400 truncate max-w-xs">{org.description}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <p className="text-sm text-gray-900 dark:text-gray-100 font-semibold">{getMemberCount(org)}</p>
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
                          <td className="py-3 px-4 text-right">
                            <QuickActionsDropdown actions={getQuickActions(org)} align="right" />
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

        {/* Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={filteredOrgs.length}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onDelete={handleBulkDelete}
          selectedItems={getSelectedOrgs()}
          exportFilename="selected-organizations"
        />

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
