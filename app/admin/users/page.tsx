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
import { disableUser, enableUser, sendPasswordResetEmail } from '@/lib/actions/admin/users';
import { useToastStore } from '@/lib/toast-store';
import { formatDateWithRelative } from '@/lib/utils/time';

interface User {
  id: string;
  name: string;
  email: string;
  status?: string;
  last_login?: string;
  organization_members?: Array<{ organization_id: string }>;
}

export default function AdminUsersPage() {
  const { addToast } = useToastStore();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
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
  }, [users, searchEmail, statusFilter]);

  const fetchUsers = async () => {
    try {
      const client = createServiceRoleClient();
      
      // If no client (development mode without backend), just show empty data
      if (!client) {
        setUsers([]);
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
      addToast('error', 'Failed to fetch users');
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

    setFilteredUsers(filtered);
  };

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOrgCount = (user: User) => user.organization_members?.length || 0;

  // Calculate stats
  const stats = {
    total: users.length,
    active: users.filter((u) => (u.status || 'active') === 'active').length,
    disabled: users.filter((u) => u.status === 'disabled').length,
  };

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-orange-dark dark:text-orange">Users</h1>
            <p className="text-gray-slate mt-2">Manage all system users</p>
          </div>

          {/* Stat Cards */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </Card>

          {/* Users Table */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-orange-dark dark:text-orange">Users List</h2>
              <Tooltip content="All registered users">
                <InfoIcon />
              </Tooltip>
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
                  {searchEmail || statusFilter !== 'all' 
                    ? 'Try adjusting your filters to see more results.'
                    : 'No users have been registered yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-light">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Email</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                        <div className="flex items-center justify-center gap-1">
                          Status
                          <Tooltip content="User access status">
                            <InfoIcon />
                          </Tooltip>
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                        <div className="flex items-center justify-center gap-1">
                          Orgs
                          <Tooltip content="Organization count">
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
                      return (
                        <tr key={user.id} className="border-b border-gray-light hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-gray-slate dark:text-gray-400">{user.email}</p>
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
                          <td className="py-3 px-4 text-center">
                            <p className="text-sm text-gray-900 dark:text-gray-100">{getOrgCount(user)}</p>
                          </td>
                          <td className="py-3 px-4">
                            <Tooltip content={lastLoginDate.absolute}>
                              <p className="text-sm text-gray-slate dark:text-gray-400 cursor-help">
                                {lastLoginDate.relative}
                              </p>
                            </Tooltip>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            {(user.status || 'active') === 'active' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actioningUserId === user.id}
                                onClick={() => confirmDisableUser(user.id, user.name)}
                              >
                                Disable
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actioningUserId === user.id}
                                onClick={() => confirmEnableUser(user.id, user.name)}
                              >
                                Enable
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actioningUserId === user.email}
                              onClick={() => confirmSendResetEmail(user.email, user.name)}
                            >
                              Reset Email
                            </Button>
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
