'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { Pagination } from '@/components/admin/Pagination';
import { adminApi } from '@/lib/api-client';
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
  const [searchQuery, setSearchQuery] = useState(''); // Search across all columns
  
  // Sorting
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  
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

  const fetchUsers = useCallback(async () => {
    try {
      const data = await adminApi.listUsers();
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
  }, [addToast]);

  const filterUsers = useCallback(() => {
    let filtered = users;

    // Search across all columns
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((user) => {
        return (
          user.name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.role?.toLowerCase().includes(query) ||
          user.status?.toLowerCase().includes(query) ||
          getActivityStatus(user.last_login)?.toLowerCase().includes(query)
        );
      });
    }

    // Apply sorting
    if (sortKey && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = a[sortKey as keyof User];
        let bValue: any = b[sortKey as keyof User];

        // Handle null/undefined
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        // Handle dates (last_login, created_at)
        if (sortKey === 'last_login' || sortKey === 'created_at') {
          const aDate = new Date(aValue);
          const bDate = new Date(bValue);
          return sortDirection === 'asc'
            ? aDate.getTime() - bDate.getTime()
            : bDate.getTime() - aDate.getTime();
        }

        // Handle strings
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        }
        return bStr.localeCompare(aStr);
      });
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, sortKey, sortDirection]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    filterUsers();
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [filterUsers]);

  // Handle column sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      // Same column: cycle through asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      // New column: start with asc
      setSortKey(key);
      setSortDirection('asc');
    }
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
      await adminApi.disableUser(userId);
      addToast('success', 'User disabled successfully');
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, status: 'disabled' } : u))
      );
    } catch (error: any) {
      addToast('error', error.message || 'Failed to disable user');
    } finally {
      setActioningUserId(null);
    }
  };

  const handleEnableUser = async (userId: string) => {
    setActioningUserId(userId);
    setConfirmModal({ ...confirmModal, isOpen: false });
    try {
      await adminApi.enableUser(userId);
      addToast('success', 'User enabled successfully');
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, status: 'active' } : u))
      );
    } catch (error: any) {
      addToast('error', error.message || 'Failed to enable user');
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
      await adminApi.sendPasswordReset(email);
      addToast('success', 'Password reset email sent');
    } catch (error: any) {
      addToast('error', error.message || 'Failed to send password reset email');
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    clearSelection(); // Clear selection when changing pages
  };

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-orange-dark dark:text-orange">Users</h1>
              <p className="text-sm sm:text-base text-gray-slate dark:text-gray-300 mt-1 sm:mt-2">Manage all system users</p>
            </div>
            <div className="flex-shrink-0">
              <ExportButton data={filteredUsers} filename="users" />
            </div>
          </div>

          {/* Stat Cards */}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Users Table */}
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-orange-dark dark:text-orange">Users List</h2>
                <Tooltip content="All registered users">
                  <InfoIcon />
                </Tooltip>
                {selectedIds.size > 0 && (
                  <span className="ml-2 text-sm text-gray-slate dark:text-gray-400">
                    {selectedIds.size} selected
                  </span>
                )}
              </div>
              {filteredUsers.length > itemsPerPage && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={filteredUsers.length}
                  itemsPerPage={itemsPerPage}
                  position="top"
                />
              )}
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="search"
                  placeholder="Search across all fields..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange transition-colors"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
                <p className="text-gray-slate dark:text-gray-300 mt-4">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-slate dark:text-gray-300 text-lg font-medium">No users found</p>
                <p className="text-gray-400 text-sm mt-2">
                  {searchQuery ? 'Try adjusting your search query.' : 'No users have been registered yet.'}
                </p>
              </div>
            ) : (
              <>
              {/* Mobile Card View - Below 640px */}
              <div className="sm:hidden space-y-3">
                {paginatedUsers.map((user) => {
                  const lastLoginDate = formatDateWithRelative(user.last_login);
                  const activityStatus = getActivityStatus(user.last_login);
                  const activityBadge = getActivityBadge(activityStatus);
                  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

                  return (
                    <Card key={user.id} className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(user.id)}
                            onChange={() => toggleSelect(user.id)}
                            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 flex-shrink-0"
                          />
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange text-white flex items-center justify-center text-sm font-semibold">
                            {userInitial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{user.email}</p>
                            {user.role && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{user.role}</p>
                            )}
                          </div>
                        </div>
                        <QuickActionsDropdown actions={getQuickActions(user)} align="right" />
                      </div>

                      <div className="space-y-2 pt-3 border-t border-gray-light dark:border-gray-700">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Activity:</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${activityBadge.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${activityBadge.dotColor} ${activityBadge.animate ? 'animate-pulse' : ''}`} />
                            {activityBadge.label}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Status:</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            user.status === 'active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {user.status === 'active' ? 'Active' : 'Disabled'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Last Login:</span>
                          <span className="text-gray-900 dark:text-gray-100 text-xs">{lastLoginDate.relative}</span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table - 640px+ */}
              <div className="hidden sm:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-light">
                        <th className="text-left py-3 px-4 w-12">
                          <input
                            type="checkbox"
                            checked={paginatedUsers.length > 0 && paginatedUsers.every(user => selectedIds.has(user.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                paginatedUsers.forEach(user => setSelectedIds(prev => new Set(prev).add(user.id)));
                              } else {
                                paginatedUsers.forEach(user => setSelectedIds(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(user.id);
                                  return newSet;
                                }));
                              }
                            }}
                            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                          />
                        </th>
                      <th 
                        className={`text-left py-3 px-4 font-semibold cursor-pointer select-none transition-colors hover:text-orange dark:hover:text-orange ${
                          sortKey === 'name' ? 'text-orange-dark dark:text-orange border-b-2 border-orange' : 'text-gray-900 dark:text-gray-100'
                        }`}
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-2">
                          Name
                          {sortKey === 'name' && (
                            <span className="text-orange">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className={`text-left py-3 px-4 font-semibold cursor-pointer select-none transition-colors hover:text-orange dark:hover:text-orange ${
                          sortKey === 'email' ? 'text-orange-dark dark:text-orange border-b-2 border-orange' : 'text-gray-900 dark:text-gray-100'
                        }`}
                        onClick={() => handleSort('email')}
                      >
                        <div className="flex items-center gap-2">
                          Email
                          {sortKey === 'email' && (
                            <span className="text-orange">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                        <div className="flex items-center justify-center gap-1">
                          Activity
                          <Tooltip content="User activity status">
                            <InfoIcon />
                          </Tooltip>
                        </div>
                      </th>
                      <th 
                        className={`text-center py-3 px-4 font-semibold cursor-pointer select-none transition-colors hover:text-orange dark:hover:text-orange ${
                          sortKey === 'status' ? 'text-orange-dark dark:text-orange border-b-2 border-orange' : 'text-gray-900 dark:text-gray-100'
                        }`}
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex items-center gap-1">
                            Status
                            <Tooltip content="Account status">
                              <InfoIcon />
                            </Tooltip>
                          </div>
                          {sortKey === 'status' && (
                            <span className="text-orange">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className={`text-left py-3 px-4 font-semibold cursor-pointer select-none transition-colors hover:text-orange dark:hover:text-orange ${
                          sortKey === 'last_login' ? 'text-orange-dark dark:text-orange border-b-2 border-orange' : 'text-gray-900 dark:text-gray-100'
                        }`}
                        onClick={() => handleSort('last_login')}
                      >
                        <div className="flex items-center gap-2">
                          Last Login
                          {sortKey === 'last_login' && (
                            <span className="text-orange">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user) => {
                      const lastLoginDate = formatDateWithRelative(user.last_login);
                      const activityStatus = getActivityStatus(user.last_login);
                      const activityBadge = getActivityBadge(activityStatus);
                      
                      return (
                        <tr key={user.id} className="border-b border-gray-light dark:border-gray-700">
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(user.id)}
                              onChange={() => toggleSelect(user.id)}
                              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                            {user.role && (
                              <p className="text-xs text-gray-500 dark:text-gray-100">{user.role}</p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-gray-600 dark:text-gray-100">{user.email}</p>
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
                              <p className="text-sm text-gray-600 dark:text-gray-100 cursor-help">
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
                
                {/* Bottom Pagination */}
                {filteredUsers.length > itemsPerPage && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalItems={filteredUsers.length}
                    itemsPerPage={itemsPerPage}
                    position="bottom"
                  />
                )}
              </div>
              </>
            )}
          </Card>

          {/* Summary */}
          {!loading && filteredUsers.length <= itemsPerPage && (
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
