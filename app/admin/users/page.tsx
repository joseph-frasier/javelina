'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { disableUser, enableUser, sendPasswordResetEmail } from '@/lib/actions/admin/users';
import { useToastStore } from '@/lib/toast-store';
import { formatDateWithRelative } from '@/lib/utils/time';
import { generateMockUsers, getActivityStatus, getActivityBadge } from '@/lib/mock-admin-data';
import { startImpersonation } from '@/lib/admin-impersonation';

interface User {
  id: string;
  name: string;
  email: string;
  status?: string;
  role?: string;
  last_login?: string;
  created_at?: string;
  organization_members?: Array<{ organization_id: string }>;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchEmail, setSearchEmail] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [actioningUserId, setActioningUserId] = useState<string | null>(null);
  
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
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchEmail, statusFilter, roleFilter, activityFilter]);

  const fetchUsers = async () => {
    try {
      const client = createServiceRoleClient();
      
      // If no client (development mode without backend), use mock data
      if (!client) {
        const mockUsers = generateMockUsers(50);
        setUsers(mockUsers as any);
        setLoading(false);
        return;
      }
      
      const { data, error } = await client
        .from('profiles')
        .select('*, organization_members(organization_id)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data || []) as User[]);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      // Fallback to mock data on error
      const mockUsers = generateMockUsers(50);
      setUsers(mockUsers as any);
      addToast('info', 'Using mock data for demonstration');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchEmail) {
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
          user.name.toLowerCase().includes(searchEmail.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((user) => (user.status || 'active') === statusFilter);
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    if (activityFilter !== 'all') {
      filtered = filtered.filter((user) => {
        const status = getActivityStatus(user.last_login);
        return status === activityFilter;
      });
    }

    setFilteredUsers(filtered);
  };

  const clearFilters = () => {
    setSearchEmail('');
    setStatusFilter('all');
    setRoleFilter('all');
    setActivityFilter('all');
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
    setSelectedIds(new Set(filteredUsers.map(u => u.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const getSelectedUsers = () => {
    return users.filter(u => selectedIds.has(u.id));
  };

  // Bulk actions
  const handleBulkDelete = () => {
    const count = selectedIds.size;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Users',
      message: `Are you sure you want to delete ${count} user${count > 1 ? 's' : ''}? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: () => {
        addToast('success', `${count} user${count > 1 ? 's' : ''} deleted`);
        clearSelection();
        setConfirmModal({ ...confirmModal, isOpen: false });
      },
    });
  };

  const handleBulkSuspend = () => {
    const count = selectedIds.size;
    addToast('success', `${count} user${count > 1 ? 's' : ''} suspended`);
    clearSelection();
  };

  const handleBulkEnable = () => {
    const count = selectedIds.size;
    addToast('success', `${count} user${count > 1 ? 's' : ''} enabled`);
    clearSelection();
  };

  // Single user actions
  const confirmDisableUser = (userId: string, userName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Disable User',
      message: `Are you sure you want to disable ${userName}? They will not be able to log in until re-enabled.`,
      variant: 'warning',
      onConfirm: () => handleDisableUser(userId),
    });
  };

  const confirmEnableUser = (userId: string, userName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Enable User',
      message: `Are you sure you want to enable ${userName}? They will be able to log in again.`,
      variant: 'info',
      onConfirm: () => handleEnableUser(userId),
    });
  };

  const confirmImpersonateUser = (user: User) => {
    setConfirmModal({
      isOpen: true,
      title: 'Impersonate User',
      message: `You will be logged in as ${user.name} (${user.email}). You'll see the application as they see it. You can exit impersonation at any time.`,
      variant: 'info',
      onConfirm: () => handleImpersonateUser(user),
    });
  };

  const confirmSendResetEmail = (email: string, userName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Send Password Reset',
      message: `Send a password reset email to ${userName} (${email})?`,
      variant: 'info',
      onConfirm: () => handleSendResetEmail(email),
    });
  };

  const handleDisableUser = async (userId: string) => {
    setActioningUserId(userId);
    setConfirmModal({ ...confirmModal, isOpen: false });
    try {
      const result = await disableUser(userId);
      if (result.error) {
        addToast('error', result.error);
      } else {
        addToast('success', 'User disabled successfully');
        setUsers((prevUsers) =>
          prevUsers.map((u) => (u.id === userId ? { ...u, status: 'disabled' } : u))
        );
      }
    } finally {
      setActioningUserId(null);
    }
  };

  const handleEnableUser = async (userId: string) => {
    setActioningUserId(userId);
    setConfirmModal({ ...confirmModal, isOpen: false });
    try {
      const result = await enableUser(userId);
      if (result.error) {
        addToast('error', result.error);
      } else {
        addToast('success', 'User enabled successfully');
        setUsers((prevUsers) =>
          prevUsers.map((u) => (u.id === userId ? { ...u, status: 'active' } : u))
        );
      }
    } finally {
      setActioningUserId(null);
    }
  };

  const handleImpersonateUser = (user: User) => {
    setConfirmModal({ ...confirmModal, isOpen: false });
    startImpersonation(user.id, user.name, user.email);
    addToast('success', `Now viewing as ${user.name}`);
    router.push('/'); // Redirect to main dashboard
  };

  const handleSendResetEmail = async (email: string) => {
    setActioningUserId(email);
    setConfirmModal({ ...confirmModal, isOpen: false });
    try {
      const result = await sendPasswordResetEmail(email);
      if (result.error) {
        addToast('error', result.error);
      } else {
        addToast('success', 'Password reset email sent');
      }
    } finally {
      setActioningUserId(null);
    }
  };

  const getQuickActions = (user: User): QuickAction[] => [
    {
      label: 'Login as User',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      onClick: () => confirmImpersonateUser(user),
    },
    {
      label: 'Send Password Reset',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      onClick: () => confirmSendResetEmail(user.email, user.name),
    },
    {
      label: (user.status || 'active') === 'active' ? 'Disable User' : 'Enable User',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      onClick: () =>
        (user.status || 'active') === 'active'
          ? confirmDisableUser(user.id, user.name)
          : confirmEnableUser(user.id, user.name),
      divider: true,
    },
    {
      label: 'Delete User',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: () => {
        addToast('info', 'Delete user functionality coming soon');
      },
      variant: 'danger',
    },
  ];

  const getOrgCount = (user: User) => user.organization_members?.length || 0;

  // Calculate stats
  const stats = {
    total: users.length,
    active: users.filter((u) => (u.status || 'active') === 'active').length,
    disabled: users.filter((u) => u.status === 'disabled').length,
    online: users.filter((u) => getActivityStatus(u.last_login) === 'online').length,
  };

  const hasActiveFilters = searchEmail || statusFilter !== 'all' || roleFilter !== 'all' || activityFilter !== 'all';

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-orange-dark dark:text-orange">Users</h1>
              <p className="text-gray-slate mt-2">Manage all system users</p>
            </div>
            <ExportButton data={filteredUsers} filename="users" />
          </div>

          {/* Stat Cards */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                label="Total Users"
                value={stats.total}
                color="blue"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
              />
              <StatCard
                label="Active Users"
                value={stats.active}
                color="green"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                label="Online Now"
                value={stats.online}
                color="green"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                }
              />
              <StatCard
                label="Disabled Users"
                value={stats.disabled}
                color="red"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                }
              />
            </div>
          )}

          {/* Filters */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                />
                <Dropdown
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value as any)}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'disabled', label: 'Disabled' }
                  ]}
                />
                <Dropdown
                  value={roleFilter}
                  onChange={setRoleFilter}
                  options={[
                    { value: 'all', label: 'All Roles' },
                    { value: 'SuperAdmin', label: 'SuperAdmin' },
                    { value: 'Admin', label: 'Admin' },
                    { value: 'Editor', label: 'Editor' },
                    { value: 'Viewer', label: 'Viewer' }
                  ]}
                />
                <Dropdown
                  value={activityFilter}
                  onChange={setActivityFilter}
                  options={[
                    { value: 'all', label: 'All Activity' },
                    { value: 'online', label: 'Online Now' },
                    { value: 'active', label: 'Active Today' },
                    { value: 'recent', label: 'Recent (30d)' },
                    { value: 'inactive', label: 'Inactive' }
                  ]}
                />
              </div>

              {hasActiveFilters && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-slate dark:text-gray-400">
                    {filteredUsers.length} of {users.length} users match your filters
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

          {/* Users Table */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-orange-dark dark:text-orange">Users List</h2>
              <Tooltip content="All registered users">
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
                <p className="text-gray-slate mt-4">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-slate text-lg font-medium">No users found</p>
                <p className="text-gray-400 text-sm mt-2">
                  {hasActiveFilters
                    ? 'Try adjusting your filters to see more results.'
                    : 'No users have been registered yet.'}
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
                          checked={selectedIds.size === filteredUsers.length && filteredUsers.length > 0}
                          onChange={(e) => e.target.checked ? selectAll() : clearSelection()}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Email</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                        <div className="flex items-center justify-center gap-1">
                          Activity
                          <Tooltip content="User activity status">
                            <InfoIcon />
                          </Tooltip>
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                        <div className="flex items-center justify-center gap-1">
                          Status
                          <Tooltip content="Account status">
                            <InfoIcon />
                          </Tooltip>
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Last Login</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const lastLoginDate = formatDateWithRelative(user.last_login);
                      const activityStatus = getActivityStatus(user.last_login);
                      const activityBadge = getActivityBadge(activityStatus);
                      
                      return (
                        <tr key={user.id} className="border-b border-gray-light hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(user.id)}
                              onChange={() => toggleSelect(user.id)}
                              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                            {user.role && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-gray-slate dark:text-gray-400">{user.email}</p>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${activityBadge.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${activityBadge.dotColor} ${activityBadge.animate ? 'animate-pulse' : ''}`} />
                              {activityBadge.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                                (user.status || 'active') === 'active'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                (user.status || 'active') === 'active' ? 'bg-green-600' : 'bg-red-600'
                              }`} />
                              {(user.status || 'active') === 'active' ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Tooltip content={lastLoginDate.absolute}>
                              <p className="text-sm text-gray-slate dark:text-gray-400 cursor-help">
                                {lastLoginDate.relative}
                              </p>
                            </Tooltip>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <QuickActionsDropdown actions={getQuickActions(user)} align="right" />
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
              Showing {filteredUsers.length} of {users.length} users
            </p>
          )}
        </div>

        {/* Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={filteredUsers.length}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onDelete={handleBulkDelete}
          onSuspend={handleBulkSuspend}
          onEnable={handleBulkEnable}
          selectedItems={getSelectedUsers()}
          exportFilename="selected-users"
        />

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
          isLoading={actioningUserId !== null}
        />
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
