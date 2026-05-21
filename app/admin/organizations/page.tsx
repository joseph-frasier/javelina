'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Tooltip, InfoIcon } from '@/components/ui/Tooltip';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { ExportButton } from '@/components/admin/ExportButton';
import { QuickActionsDropdown, QuickAction } from '@/components/admin/QuickActionsDropdown';
import { Pagination } from '@/components/admin/Pagination';
import { ViewOrganizationDetailsModal } from '@/components/modals/ViewOrganizationDetailsModal';
import { ViewOrganizationMembersModal } from '@/components/modals/ViewOrganizationMembersModal';
import { ConfirmDisableOrganizationModal } from '@/components/modals/ConfirmDisableOrganizationModal';
import { adminApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { formatDateWithRelative } from '@/lib/utils/time';

interface Organization {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
  is_active?: boolean;
  billing_phone?: string;
  billing_email?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  admin_contact_email?: string;
  admin_contact_phone?: string;
  member_count?: number;
  zone_count?: number;
  record_count?: number;
  organization_members?: Array<{ organization_id: string }>;
}

function AdminOrganizationsPageContent() {
  const searchParams = useSearchParams();
  const { addToast } = useToastStore();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  
  // Search across all columns (URL-synced)
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk selection — mirrored from AdminDataTable
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Mobile-only pagination state (desktop pagination is inside AdminDataTable)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  
  const [actioningOrgId, setActioningOrgId] = useState<string | null>(null);
  
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

  // Modal states for viewing organization details and members
  const [viewDetailsOrgId, setViewDetailsOrgId] = useState<string | null>(null);
  const [viewDetailsOrgName, setViewDetailsOrgName] = useState<string>('');
  const [viewDetailsOrgData, setViewDetailsOrgData] = useState<any | null>(null);
  const [viewMembersOrgId, setViewMembersOrgId] = useState<string | null>(null);
  const [viewMembersOrgName, setViewMembersOrgName] = useState<string>('');
  const [disableOrgId, setDisableOrgId] = useState<string | null>(null);
  const [disableOrgName, setDisableOrgName] = useState<string>('');
  const [disableOrgIsDisabled, setDisableOrgIsDisabled] = useState<boolean>(false);

  const fetchOrganizations = useCallback(async () => {
    try {
      // Fetch all pages (backend caps at 100 per request)
      const pageSize = 100;
      let allOrgs: Organization[] = [];
      let page = 1;
      let batch: Organization[];
      do {
        batch = ((await adminApi.listOrganizations({ page, limit: pageSize })) || []) as Organization[];
        allOrgs = allOrgs.concat(batch);
        page++;
      } while (batch.length === pageSize);
      setOrgs(allOrgs);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      addToast('error', 'Failed to load organizations from API');
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const applyFilter = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredOrgs(orgs);
      return;
    }
    const query = searchQuery.toLowerCase();
    setFilteredOrgs(
      orgs.filter((org) => {
        const memberCount = getMemberCount(org).toString();
        const status = org.deleted_at ? 'deleted' : 'active';
        return (
          org.name?.toLowerCase().includes(query) ||
          org.description?.toLowerCase().includes(query) ||
          memberCount.includes(query) ||
          status.includes(query)
        );
      })
    );
  }, [orgs, searchQuery]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

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

  // Bulk actions (not yet wired to backend endpoints)
  const handleBulkDelete = () => {
    addToast('error', 'Bulk delete is not yet implemented. Use individual organization actions instead.');
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
      await adminApi.softDeleteOrganization(orgId);
      addToast('success', 'Organization deleted successfully');
      setOrgs((prevOrgs) =>
        prevOrgs.map((org) =>
          org.id === orgId ? { ...org, deleted_at: new Date().toISOString() } : org
        )
      );
    } catch (error: any) {
      addToast('error', error.message || 'Failed to delete organization');
    } finally {
      setActioningOrgId(null);
    }
  };

  const handleDisableOrganization = async () => {
    if (!disableOrgId) return;

    setActioningOrgId(disableOrgId);
    const isCurrentlyDisabled = disableOrgIsDisabled;

    try {
      if (isCurrentlyDisabled) {
        await adminApi.enableOrganization(disableOrgId);
        addToast('success', 'Organization enabled successfully');
        setOrgs((prevOrgs) =>
          prevOrgs.map((org) =>
            org.id === disableOrgId ? { ...org, is_active: true } : org
          )
        );
      } else {
        await adminApi.disableOrganization(disableOrgId);
        addToast('success', 'Organization disabled successfully');
        setOrgs((prevOrgs) =>
          prevOrgs.map((org) =>
            org.id === disableOrgId ? { ...org, is_active: false } : org
          )
        );
      }
    } catch (error: any) {
      addToast('error', error.message || `Failed to ${isCurrentlyDisabled ? 'enable' : 'disable'} organization`);
    } finally {
      setActioningOrgId(null);
      setDisableOrgId(null);
    }
  };

  const getQuickActions = (org: Organization): QuickAction[] => {
    const isDisabled = org.is_active === false;
    
    return [
      {
        label: 'View Details',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ),
        onClick: async () => {
          try {
            const data = await adminApi.getOrganization(org.id);
            setViewDetailsOrgData(data);
            setViewDetailsOrgId(org.id);
            setViewDetailsOrgName(org.name);
          } catch (error) {
            addToast('error', (error as Error).message || 'Failed to load organization details');
          }
        },
      },
      {
        label: 'View Members',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        onClick: () => {
          setViewMembersOrgId(org.id);
          setViewMembersOrgName(org.name);
        },
      },
      {
        label: isDisabled ? 'Enable Organization' : 'Disable Organization',
        icon: isDisabled ? (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        ),
        onClick: () => {
          setDisableOrgId(org.id);
          setDisableOrgName(org.name);
          setDisableOrgIsDisabled(isDisabled);
        },
        variant: isDisabled ? undefined : 'danger',
        divider: true,
      },
    ];
  };

  const getMemberCount = (org: Organization) => org.organization_members?.length || 0;
  const getStatus = (org: Organization) => {
    if (org.deleted_at) return 'deleted';
    if (org.is_active === false) return 'disabled';
    return 'active';
  };

  // Calculate stats
  const stats = {
    total: orgs.length,
    active: orgs.filter((o) => !o.deleted_at).length,
    disabled: orgs.filter((o) => o.is_active === false).length,
    totalMembers: orgs.reduce((sum, org) => sum + getMemberCount(org), 0),
  };

  // Mobile-only pagination calculations (desktop pagination is inside AdminDataTable)
  const totalPages = Math.ceil(filteredOrgs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrgs = filteredOrgs.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const columns: AdminDataTableColumn<Organization>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortValue: (o) => (o.name ?? '').toLowerCase(),
        render: (o) => (
          <div>
            <p className="font-medium text-text">{o.name}</p>
            {o.description && (
              <p className="text-sm text-text-muted truncate max-w-xs">{o.description}</p>
            )}
          </div>
        ),
      },
      {
        key: 'members',
        header: (
          <span className="inline-flex items-center justify-center gap-1">
            Members
            <Tooltip content="Member count">
              <InfoIcon />
            </Tooltip>
          </span>
        ),
        align: 'center',
        sortValue: (o) => getMemberCount(o),
        render: (o) => (
          <span className="text-sm font-semibold text-text">{getMemberCount(o)}</span>
        ),
      },
      {
        key: 'status',
        header: (
          <span className="inline-flex items-center justify-center gap-1">
            Status
            <Tooltip content="Organization status">
              <InfoIcon />
            </Tooltip>
          </span>
        ),
        align: 'center',
        sortable: false,
        render: (o) => {
          if (o.deleted_at) return <AdminStatusBadge variant="neutral" label="Deleted" />;
          if (o.is_active === false) return <AdminStatusBadge variant="danger" label="Disabled" />;
          return <AdminStatusBadge variant="success" label="Active" />;
        },
      },
      {
        key: 'created_at',
        header: 'Created',
        sortValue: (o) => (o.created_at ? new Date(o.created_at) : null),
        render: (o) => {
          const d = formatDateWithRelative(o.created_at);
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
        render: (o) => (
          <div onClick={(e) => e.stopPropagation()}>
            <QuickActionsDropdown actions={getQuickActions(o)} align="right" />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const exportData =
    selectedIds.size > 0
      ? filteredOrgs.filter((o) => selectedIds.has(o.id))
      : filteredOrgs;

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <AdminPageHeader
          title="Organizations"
          subtitle="Manage all organizations"
          actions={<ExportButton data={exportData} filename="organizations" />}
        />

        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <AdminStatCard
              label="Total Organizations"
              tone="info"
              value={stats.total}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
            />
            <AdminStatCard
              label="Active"
              tone="success"
              value={stats.active}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <AdminStatCard
              label="Disabled Organizations"
              tone="danger"
              value={stats.disabled}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              }
            />
            <AdminStatCard
              label="Total Members"
              tone="accent"
              value={stats.totalMembers}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
            />
          </div>
        )}

        <Card title="Organizations List" description="User groups">
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

          <div className="sm:hidden">
            {showSkeleton ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-lg border border-border p-4 bg-surface">
                    <div className="h-4 bg-surface-alt rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-surface-alt rounded w-1/2 mt-2 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : filteredOrgs.length === 0 ? (
              <div className="py-10 flex items-center justify-center border border-border rounded-lg">
                <div className="text-center">
                  <svg className="mx-auto h-10 w-10 text-text-faint mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                  </svg>
                  <p className="text-sm font-medium text-text">No organizations found</p>
                  <p className="text-xs text-text-muted mt-1">
                    {searchQuery ? 'Try adjusting your search query.' : 'No organizations yet.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedOrgs.map((org) => {
                  const createdDate = formatDateWithRelative(org.created_at);
                  const isDeleted = !!org.deleted_at;
                  const isDisabled = org.is_active === false;

                  return (
                    <div
                      key={org.id}
                      className="rounded-lg border border-border bg-surface p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(org.id)}
                            onChange={() => toggleSelect(org.id)}
                            className="w-4 h-4 text-accent border-border rounded focus:ring-accent flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-text truncate">{org.name}</p>
                            {org.description && (
                              <p className="text-xs text-text-muted mt-1 line-clamp-2">{org.description}</p>
                            )}
                          </div>
                        </div>
                        <QuickActionsDropdown actions={getQuickActions(org)} align="right" />
                      </div>

                      <div className="space-y-2 pt-3 border-t border-border">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-muted">Members:</span>
                          <span className="text-text font-medium">{getMemberCount(org)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-muted">Status:</span>
                          {isDeleted ? (
                            <AdminStatusBadge variant="neutral" label="Deleted" />
                          ) : isDisabled ? (
                            <AdminStatusBadge variant="danger" label="Disabled" />
                          ) : (
                            <AdminStatusBadge variant="success" label="Active" />
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-muted">Created:</span>
                          <span className="text-text text-xs">{createdDate.relative}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredOrgs.length > itemsPerPage && (
                  <div className="pt-2">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      totalItems={filteredOrgs.length}
                      itemsPerPage={itemsPerPage}
                      position="bottom"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="hidden sm:block">
            <AdminDataTable<Organization>
              data={filteredOrgs}
              columns={columns}
              getRowId={(o) => o.id}
              selectable
              onSelectionChange={setSelectedIds}
              bulkActions={{ onDelete: handleBulkDelete }}
              defaultSort={{ key: 'name', direction: 'asc' }}
              pageSize={itemsPerPage}
              loading={showSkeleton}
              loadingRows={8}
              emptyState={
                <div className="py-12 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-text-faint mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                    </svg>
                    <p className="text-text font-medium">No organizations found</p>
                    <p className="text-text-muted text-sm mt-1">
                      {searchQuery ? 'Try adjusting your search query.' : 'No organizations yet.'}
                    </p>
                  </div>
                </div>
              }
            />
          </div>
        </Card>

        {!loading && filteredOrgs.length <= itemsPerPage && (
          <p className="text-sm text-text-muted mt-4">
            Showing {filteredOrgs.length} of {orgs.length} organizations
          </p>
        )}

        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
          isLoading={actioningOrgId !== null}
        />

        <ViewOrganizationDetailsModal
          isOpen={viewDetailsOrgId !== null}
          onClose={() => {
            setViewDetailsOrgId(null);
            setViewDetailsOrgName('');
            setViewDetailsOrgData(null);
          }}
          organizationId={viewDetailsOrgId || ''}
          organizationName={viewDetailsOrgName}
          organizationData={viewDetailsOrgData}
        />

        <ViewOrganizationMembersModal
          isOpen={viewMembersOrgId !== null}
          onClose={() => setViewMembersOrgId(null)}
          organizationId={viewMembersOrgId || ''}
          organizationName={viewMembersOrgName}
        />

        <ConfirmDisableOrganizationModal
          isOpen={disableOrgId !== null}
          onClose={() => setDisableOrgId(null)}
          onConfirm={handleDisableOrganization}
          organizationName={disableOrgName}
          isDisabled={disableOrgIsDisabled}
          isLoading={actioningOrgId !== null}
        />
      </AdminLayout>
    </AdminProtectedRoute>
  );
}

export default function AdminOrganizationsPage() {
  return (
    <Suspense fallback={null}>
      <AdminOrganizationsPageContent />
    </Suspense>
  );
}
