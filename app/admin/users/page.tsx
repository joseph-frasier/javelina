'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { disableUser, enableUser, sendPasswordResetEmail } from '@/lib/actions/admin/users';
import { useToastStore } from '@/lib/toast-store';

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

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchEmail, statusFilter]);

  const fetchUsers = async () => {
    try {
      const client = createServiceRoleClient();
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

  const handleDisableUser = async (userId: string) => {
    setActioningUserId(userId);
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

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-orange-dark">Users</h1>
            <p className="text-gray-slate mt-2">Manage all system users</p>
          </div>

          {/* Filters */}
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="Search by email or name..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
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
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Users Table */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-orange-dark mb-4">Users List</h2>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-slate">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-slate">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-light">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Email</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900">Orgs</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Last Login</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-light hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{user.name}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-slate">{user.email}</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                              (user.status || 'active') === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {(user.status || 'active') === 'active' ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <p className="text-sm text-gray-900">{getOrgCount(user)}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-slate">{formatDate(user.last_login)}</p>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {(user.status || 'active') === 'active' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actioningUserId === user.id}
                              onClick={() => handleDisableUser(user.id)}
                            >
                              Disable
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actioningUserId === user.id}
                              onClick={() => handleEnableUser(user.id)}
                            >
                              Enable
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actioningUserId === user.email}
                            onClick={() => handleSendResetEmail(user.email)}
                          >
                            Reset Email
                          </Button>
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
              Showing {filteredUsers.length} of {users.length} users
            </p>
          )}
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
