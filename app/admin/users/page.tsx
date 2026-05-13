'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Tooltip, InfoIcon } from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { ExportButton } from '@/components/admin/ExportButton';
import { QuickActionsDropdown, QuickAction } from '@/components/admin/QuickActionsDropdown';
import { Pagination } from '@/components/admin/Pagination';
import { ViewUserDetailsModal } from '@/components/modals/ViewUserDetailsModal';
import { adminApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { formatDateWithRelative } from '@/lib/utils/time';
import { getActivityStatus, getActivityBadge } from '@/lib/utils/activity';

type ActivityVariant = 'success' | 'info' | 'neutral' | 'accent';

const ACTIVITY_VARIANT_MAP: Record<string, ActivityVariant> = {
  online: 'success',
  active: 'info',
  recent: 'neutral',
  inactive: 'neutral',
};
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

function AdminUsersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToastStore();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  
  // Search across all columns (URL-synced)
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk selection — mirrored from AdminDataTable so we can pass it to ExportButton
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Mobile-only pagination state (desktop pagination is inside AdminDataTable)
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

  // View user details modal state
  const [viewUserModalOpen, setViewUserModalOpen] = useState(false);
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [viewUserName, setViewUserName] = useState<string>('');
  const [viewUserData, setViewUserData] = useState<any | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      // Fetch all pages (backend caps at 100 per request)
      const pageSize = 100;
      let allUsers: User[] = [];
      let page = 1;
      let batch: User[];
      do {
        batch = ((await adminApi.listUsers({ page, limit: pageSize })) || []) as User[];
        allUsers = allUsers.concat(batch);
        page++;
      } while (batch.length === pageSize);
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      addToast('error', 'Failed to load users from API');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Apply search filter — preserves the original cross-column matching semantics
  const applyFilter = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }
    const query = searchQuery.toLowerCase();
    setFilteredUsers(
      users.filter((user) => {
        return (
          user.name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.role?.toLowerCase().includes(query) ||
          user.status?.toLowerCase().includes(query) ||
          getActivityStatus(user.last_login)?.toLowerCase().includes(query)
        );
      })
    );
  }, [users, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const search = searchParams.get('search');
    if (search !== null) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  useEffect(() => {
    applyFilter();
    setCurrentPage(1);
  }, [applyFilter]);

  // Delay showing skeleton to avoid flash for quick loads
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowSkeleton(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(false);
    }
  }, [loading]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getSelectedUsers = () => {
    return users.filter((u) => selectedIds.has(u.id));
  };

  // Bulk actions (not yet wired to backend endpoints)
  const handleBulkDelete = () => {
    addToast('error', 'Bulk delete is not yet implemented. Use individual user actions instead.');
  };

  const handleBulkSuspend = () => {
    addToast('error', 'Bulk suspend is not yet implemented. Use individual user actions instead.');
  };

  const handleBulkEnable = () => {
    addToast('error', 'Bulk enable is not yet implemented. Use individual user actions instead.');
  };

  // Single user actions
  const confirmDisableUser = (userId: string, userName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Disable User',
      message: `This user will be unable to log in until re-enabled. Note: If they are currently logged in, they will be signed out when they try to navigate or refresh.`,
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
      message: `A password reset email will be sent to ${email}.`,
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
      label: 'View Details',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      onClick: async () => {
        setLoadingUserDetails(true);
        try {
          const data = await adminApi.getUser(user.id);
          setViewUserData(data);
        setViewUserId(user.id);
        setViewUserName(user.name);
          setViewUserModalOpen(true);
        } catch (error: any) {
          addToast('error', error.message || 'Failed to load user details');
        } finally {
          setLoadingUserDetails(false);
        }
      },
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
      variant: (user.status || 'active') === 'active' ? 'danger' : 'default',
      divider: true,
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

  // Build column definitions for AdminDataTable (desktop only).
  const columns: AdminDataTableColumn<User>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortValue: (u) => (u.name ?? '').toLowerCase(),
        render: (u) => (
          <div>
            <p className="font-medium text-text">{u.name}</p>
            {u.role && <p className="text-xs text-text-muted mt-0.5">{u.role}</p>}
          </div>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        sortValue: (u) => (u.email ?? '').toLowerCase(),
        render: (u) => <span className="text-sm text-text-muted">{u.email}</span>,
      },
      {
        key: 'activity',
        header: (
          <span className="inline-flex items-center justify-center gap-1">
            Activity
            <Tooltip content="User activity status">
              <InfoIcon />
            </Tooltip>
          </span>
        ),
        align: 'center',
        sortable: false,
        render: (u) => {
          const status = getActivityStatus(u.last_login);
          const badge = getActivityBadge(status);
          const variant = ACTIVITY_VARIANT_MAP[status] ?? 'neutral';
          return (
            <AdminStatusBadge
              variant={variant}
              label={badge.label}
              animate={badge.animate}
            />
          );
        },
      },
      {
        key: 'status',
        header: (
          <span className="inline-flex items-center justify-center gap-1">
            Status
            <Tooltip content="Account status">
              <InfoIcon />
            </Tooltip>
          </span>
        ),
        align: 'center',
        sortValue: (u) => (u.status ?? 'active').toLowerCase(),
        render: (u) => {
          const isActive = (u.status || 'active') === 'active';
          return (
            <AdminStatusBadge
              variant={isActive ? 'success' : 'danger'}
              label={isActive ? 'Active' : 'Disabled'}
            />
          );
        },
      },
      {
        key: 'last_login',
        header: 'Last Login',
        sortValue: (u) => (u.last_login ? new Date(u.last_login) : null),
        render: (u) => {
          const d = formatDateWithRelative(u.last_login);
          return (
            <Tooltip content={d.absolute}>
              <span className="text-sm text-text-muted cursor-help">{d.relative}</span>
            </Tooltip>
          );
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        sortable: false,
        render: (u) => (
          <div onClick={(e) => e.stopPropagation()}>
            <QuickActionsDropdown actions={getQuickActions(u)} align="right" />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Pagination calculations for the mobile card view (desktop pagination is inside AdminDataTable)
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const exportData = selectedIds.size > 0 ? getSelectedUsers() : filteredUsers;

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <AdminPageHeader
          title="Users"
          subtitle="Manage all system users"
          actions={<ExportButton data={exportData} filename="users" />}
        />

        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <AdminStatCard
              label="Total Users"
              tone="info"
              value={stats.total}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
            />
            <AdminStatCard
              label="Active Users"
              tone="success"
              value={stats.active}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <AdminStatCard
              label="Online Now"
              tone="success"
              value={stats.online}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              }
            />
            <AdminStatCard
              label="Disabled Users"
              tone="danger"
              value={stats.disabled}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              }
            />
          </div>
        )}

        <Card title="Users List" description="All registered users">
          {/* Lifted search input — preserves URL ?search= sync from searchParams effect */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="search"
                placeholder="Search across all fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-3 rounded-md border border-border bg-surface-alt text-sm text-text placeholder:text-text-faint transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-focus-ring"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Mobile card view (sm:hidden) — paginated by page-level state */}
          <div className="sm:hidden">
            {showSkeleton ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-lg border border-border p-4 bg-surface">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-4 h-4 bg-surface-alt rounded animate-pulse" />
                        <div className="w-10 h-10 bg-surface-alt rounded-full animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-surface-alt rounded w-3/4 animate-pulse" />
                          <div className="h-3 bg-surface-alt rounded w-1/2 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-10 flex items-center justify-center border border-border rounded-lg">
                <div className="text-center">
                  <svg className="mx-auto h-10 w-10 text-text-faint mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-sm font-medium text-text">No users found</p>
                  <p className="text-xs text-text-muted mt-1">
                    {searchQuery ? 'Try adjusting your search query.' : 'No users have been registered yet.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedUsers.map((user) => {
                  const lastLoginDate = formatDateWithRelative(user.last_login);
                  const activityStatus = getActivityStatus(user.last_login);
                  const activityBadge = getActivityBadge(activityStatus);
                  const activityVariant = ACTIVITY_VARIANT_MAP[activityStatus] ?? 'neutral';
                  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
                  const isActive = (user.status || 'active') === 'active';

                  return (
                    <div
                      key={user.id}
                      className="rounded-lg border border-border bg-surface p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(user.id)}
                            onChange={() => toggleSelect(user.id)}
                            className="w-4 h-4 text-accent border-border rounded focus:ring-accent flex-shrink-0"
                          />
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold">
                            {userInitial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-text truncate">{user.name}</p>
                            <p className="text-xs text-text-muted truncate">{user.email}</p>
                            {user.role && (
                              <p className="text-xs text-text-muted mt-0.5">{user.role}</p>
                            )}
                          </div>
                        </div>
                        <QuickActionsDropdown actions={getQuickActions(user)} align="right" />
                      </div>

                      <div className="space-y-2 pt-3 border-t border-border">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-muted">Activity:</span>
                          <AdminStatusBadge
                            variant={activityVariant}
                            label={activityBadge.label}
                            animate={activityBadge.animate}
                          />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-muted">Status:</span>
                          <AdminStatusBadge
                            variant={isActive ? 'success' : 'danger'}
                            label={isActive ? 'Active' : 'Disabled'}
                          />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-muted">Last Login:</span>
                          <span className="text-text text-xs">{lastLoginDate.relative}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredUsers.length > itemsPerPage && (
                  <div className="pt-2">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      totalItems={filteredUsers.length}
                      itemsPerPage={itemsPerPage}
                      position="bottom"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop table — AdminDataTable owns sort/pagination/selection */}
          <div className="hidden sm:block">
            <AdminDataTable<User>
              data={filteredUsers}
              columns={columns}
              getRowId={(u) => u.id}
              selectable
              onSelectionChange={setSelectedIds}
              bulkActions={{
                onEnable: handleBulkEnable,
                onSuspend: handleBulkSuspend,
                onDelete: handleBulkDelete,
              }}
              pageSize={itemsPerPage}
              loading={showSkeleton}
              loadingRows={8}
              emptyState={
                <div className="py-12 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-text-faint mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-text font-medium">No users found</p>
                    <p className="text-text-muted text-sm mt-1">
                      {searchQuery ? 'Try adjusting your search query.' : 'No users have been registered yet.'}
                    </p>
                  </div>
                </div>
              }
            />
          </div>
        </Card>

        {/* Summary */}
        {!loading && filteredUsers.length <= itemsPerPage && (
          <p className="text-sm text-text-muted mt-4">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        )}

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

        {/* View User Details Modal */}
        {(viewUserModalOpen || viewUserId) && viewUserId && (
          <ViewUserDetailsModal
            isOpen={viewUserModalOpen}
            onClose={() => {
              setViewUserModalOpen(false);
              setTimeout(() => {
                setViewUserId(null);
                setViewUserName('');
                setViewUserData(null);
              }, 300);
            }}
            userId={viewUserId}
            userName={viewUserName}
            userData={viewUserData}
          />
        )}
      </AdminLayout>
    </AdminProtectedRoute>
  );
}


export default function AdminUsersPage() {
  return (
    <Suspense fallback={null}>
      <AdminUsersPageContent />
    </Suspense>
  );
}
