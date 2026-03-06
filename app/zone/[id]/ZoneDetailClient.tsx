'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/Card';
import { CollapsibleCard } from '@/components/ui/CollapsibleCard';
import Button from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
interface OrganizationDetail {
  id: string;
  name: string;
}
// Dynamically import chart component to reduce initial bundle (removes 7MB recharts)
const RecordDistributionChart = dynamic(
  () => import('@/components/dns/RecordDistributionChart').then(mod => ({ default: mod.RecordDistributionChart })),
  { 
    loading: () => <div className="h-64 flex items-center justify-center text-gray-500">Loading chart...</div>,
    ssr: false 
  }
);
import { AuditTimeline } from '@/components/dns/AuditTimeline';
import { DiffViewer } from '@/components/dns/DiffViewer';
import Dropdown from '@/components/ui/Dropdown';
import { updateZone, deleteZone } from '@/lib/actions/zones';
import { useToastStore } from '@/lib/toast-store';
import { useAuthStore } from '@/lib/auth-store';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { 
  getZoneSummary, 
  getZoneAuditLogs, 
  exportZoneJSON,
  ZoneSummary
} from '@/lib/api/dns';
import { AuditLog } from '@/lib/mock-dns-data';
import type { DNSRecord, DNSRecordFormData } from '@/types/dns';
import { DNSRecordsTable } from '@/components/dns/DNSRecordsTable';
import { VerificationChecklist } from '@/components/dns/VerificationChecklist';
import { ManageDNSRecordModal } from '@/components/modals/ManageDNSRecordModal';
import { DeleteZoneModal } from '@/components/modals/DeleteZoneModal';
import { DNSRecordDetailModal } from '@/components/modals/DNSRecordDetailModal';
import { EditZoneModal, type EditZoneFormData } from '@/components/modals/EditZoneModal';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { 
  createDNSRecord,
  updateDNSRecord,
  deleteDNSRecord,
  bulkDeleteDNSRecords,
  duplicateDNSRecord,
  getDNSRecords,
  toggleDNSRecordStatus,
} from '@/lib/actions/dns-records';

interface ZoneDetailClientProps {
  zone: any;
  zoneId: string;
  organization?: OrganizationDetail | null;
  userOrgRole?: string | null;
}

export function ZoneDetailClient({ zone, zoneId, organization, userOrgRole }: ZoneDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const { user } = useAuthStore();
  const [zoneSummary, setZoneSummary] = useState<ZoneSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>([]);
  const [filteredDnsRecords, setFilteredDnsRecords] = useState<DNSRecord[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isDeleteSaving, setIsDeleteSaving] = useState(false);
  
  // DNS Records state
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showEditRecordModal, setShowEditRecordModal] = useState(false);
  const [showRecordDetailModal, setShowRecordDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DNSRecord | null>(null);
  const [recordToEdit, setRecordToEdit] = useState<DNSRecord | null>(null);
  const [showDeleteRecordConfirm, setShowDeleteRecordConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<DNSRecord | null>(null);
  const [isRecordLoading, setIsRecordLoading] = useState(false);
  const hasOpenedDeepLinkedRecordRef = useRef(false);


  
  // Edit form state
  const [editFormData, setEditFormData] = useState<EditZoneFormData>({
    name: zone.name || '',
    description: zone.description || '',
    admin_email: zone.admin_email || 'admin@example.com',
    negative_caching_ttl: zone.negative_caching_ttl || 3600,
  });
  const [isEditSaving, setIsEditSaving] = useState(false);

  // BillingContacts only see billing-related audit logs — zone logs are DNS-only
  const canViewAuditLogs = userOrgRole !== 'BillingContact';

  // Load data
  useEffect(() => {
    const loadData = async () => {
      const [summary, logs, records] = await Promise.all([
        getZoneSummary(zoneId, zone.name, zone.records_count || 50),
        canViewAuditLogs ? getZoneAuditLogs(zoneId, zone.name) : Promise.resolve([]),
        getDNSRecords(zoneId), // Use server action for consistency - routes through Express API
      ]);
      setZoneSummary(summary);
      setAuditLogs(logs);
      setDnsRecords(records);
      setFilteredDnsRecords(records);
    };
    loadData();
  }, [zoneId, zone.name, zone.records_count, canViewAuditLogs]);

  // If the page is opened with ?record=<id>, auto-open that DNS record in the details modal.
  useEffect(() => {
    const deepLinkedRecordId = searchParams.get('record');
    if (!deepLinkedRecordId) return;
    if (hasOpenedDeepLinkedRecordRef.current) return;
    if (!dnsRecords.length) return;

    const targetRecord = dnsRecords.find((record) => record.id === deepLinkedRecordId);
    if (!targetRecord) return;

    hasOpenedDeepLinkedRecordRef.current = true;
    setSelectedRecord(targetRecord);
    setShowRecordDetailModal(true);
  }, [dnsRecords, searchParams]);

  // DNS Record handlers
  const refreshDNSRecords = async () => {
    try {
      const records = await getDNSRecords(zoneId);
      setDnsRecords(records);
      setFilteredDnsRecords(records);
    } catch (error) {
      console.error('Error refreshing DNS records:', error);
      addToast('error', 'Failed to refresh DNS records');
    }
  };

  // Refresh all zone data (records, audit logs, and summary)
  const refreshAllData = async () => {
    try {
      const [summary, logs, records] = await Promise.all([
        getZoneSummary(zoneId, zone.name, zone.records_count || 50),
        canViewAuditLogs ? getZoneAuditLogs(zoneId, zone.name) : Promise.resolve([]),
        getDNSRecords(zoneId),
      ]);
      setZoneSummary(summary);
      setAuditLogs(logs);
      setDnsRecords(records);
      setFilteredDnsRecords(records);
    } catch (error) {
      console.error('Error refreshing zone data:', error);
    }
  };

  const handleRecordClick = (record: DNSRecord) => {
    setSelectedRecord(record);
    setShowRecordDetailModal(true);
  };

  const handleAddRecord = async (formData: DNSRecordFormData) => {
    try {
      await createDNSRecord(zoneId, formData);
      addToast('success', 'DNS record created successfully');
      await refreshAllData();
      router.refresh();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to create DNS record');
      throw error;
    }
  };

  const handleEditRecord = async (formData: DNSRecordFormData) => {
    if (!recordToEdit) return;
    try {
      await updateDNSRecord(recordToEdit.id, formData);
      addToast('success', 'DNS record updated successfully');
      await refreshAllData();
      router.refresh();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to update DNS record');
      throw error;
    }
  };

  const handleDeleteRecord = async (record: DNSRecord) => {
    setRecordToDelete(record);
    setShowDeleteRecordConfirm(true);
  };

  const confirmDeleteRecord = async () => {
    if (!recordToDelete) return;
    setIsRecordLoading(true);
    try {
      await deleteDNSRecord(recordToDelete.id);
      addToast('success', 'DNS record deleted successfully');
      await refreshAllData();
      setShowDeleteRecordConfirm(false);
      setRecordToDelete(null);
      router.refresh();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to delete DNS record');
    } finally {
      setIsRecordLoading(false);
    }
  };

  const handleDuplicateRecord = (record: DNSRecord) => {
    setRecordToEdit({
      ...record,
      id: '', // Clear ID for new record
      name: `${record.name}-copy`,
    } as DNSRecord);
    setShowEditRecordModal(true);
  };

  // Note: Toggle status functionality has been deprecated as 'active' field was removed from schema
  // const handleToggleStatus = async (record: DNSRecord) => { ... }

  const handleBulkDelete = async () => {
    if (selectedRecords.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedRecords.length} DNS record(s)?`
    );
    
    if (!confirmed) return;

    setIsRecordLoading(true);
    try {
      const result = await bulkDeleteDNSRecords(selectedRecords);
      if (result.success > 0) {
        addToast('success', `Successfully deleted ${result.success} record(s)`);
      }
      if (result.errors.length > 0) {
        result.errors.forEach(error => addToast('error', error));
      }
      setSelectedRecords([]);
      await refreshAllData();
      router.refresh();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to delete records');
    } finally {
      setIsRecordLoading(false);
    }
  };

  const handleExport = async () => {
    await exportZoneJSON(zoneId, zone.name);
  };

  const handleSaveZone = async () => {
    setIsEditSaving(true);
    
    try {
      // Validate required fields
      if (!editFormData.name.trim()) {
        addToast('error', 'Zone name is required');
        setIsEditSaving(false);
        return;
      }

      // Call the server action to update the zone
      const result = await updateZone(zoneId, {
        name: editFormData.name,
        description: editFormData.description,
        admin_email: editFormData.admin_email,
        negative_caching_ttl: editFormData.negative_caching_ttl,
      });

      if (result.error) {
        addToast('error', result.error);
        setIsEditSaving(false);
        return;
      }

      // Success
      addToast('success', `Zone "${editFormData.name}" updated successfully!`);
      setShowEditModal(false);
      setIsEditSaving(false);
      
      // Refresh audit logs to show the zone update
      await refreshAllData();
      
      // Invalidate React Query cache to update sidebar
      if (zone.organization_id) {
        await queryClient.invalidateQueries({ queryKey: ['zones', zone.organization_id] });
      }
      
      // Soft refresh to update data without losing toast
      router.refresh();
    } catch (error) {
      addToast('error', `Error saving zone: ${error}`);
      setIsEditSaving(false);
    }
  };

  const handleDeleteZone = async () => {
    if (isDeleteSaving) return;
    setIsDeleteSaving(true);

    try {
      const result = await deleteZone(zone.id);
      
      if (result.error) {
        addToast('error', `Failed to delete zone: ${result.error}`);
        return;
      }
      
      // Invalidate React Query cache to update sidebar immediately
      queryClient.invalidateQueries({ queryKey: ['zones', zone.organization_id] });
      
      addToast('success', `Zone ${zone.name} deleted permanently`);
      setShowDeleteModal(false);
      setDeleteConfirmationInput('');
      
      // Redirect to organization page
      if (organization) {
        router.push(`/organization/${organization.id}`);
      } else {
        router.push('/');
      }
    } catch (error) {
      addToast('error', `Error deleting zone: ${error}`);
    } finally {
      setIsDeleteSaving(false);
    }
  };

  // Build breadcrumb items
  const breadcrumbItems = [];
  if (organization) {
    breadcrumbItems.push(
      { label: organization.name, href: `/organization/${organization.id}` },
      { label: zone.name }
    );
  }

  if (!zoneSummary) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-orange mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="mt-4 text-gray-slate">Loading zone data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] 2xl:max-w-[1900px] 3xl:max-w-full mx-auto px-4 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8">
      {/* Email Verification Banner */}
      {user && !user.email_verified && (
        <EmailVerificationBanner email={user.email} />
      )}

      {/* Breadcrumb */}
      {breadcrumbItems.length > 0 && (
        <Breadcrumb items={breadcrumbItems} className="mb-4 sm:mb-6" />
      )}

      {/* Header with Status Badges */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-orange-dark dark:text-orange mb-3 break-words">{zone.name}</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* SOA Serial Badge */}
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                SOA Serial: {zone.soa_serial}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-shrink-0">
            <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)} className="justify-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Button>
            <Button variant="primary" size="sm" onClick={() => window.location.reload()} className="justify-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reload
            </Button>
            <Button variant="primary" size="sm" onClick={handleExport} className="justify-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteModal(true)} className="!bg-red-600 hover:!bg-red-700 !text-white justify-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card title="Total Records" className="p-4 sm:p-6">
          <p className="text-2xl sm:text-3xl font-bold text-orange dark:text-orange">{zoneSummary.totalRecords}</p>
          <p className="text-sm text-gray-slate dark:text-gray-400 mt-1">{zoneSummary.recordTypeCounts.length} record types</p>
        </Card>
        <Card title="Deployment Status" className="p-4 sm:p-6">
          <div className="space-y-2">
            <div className="flex items-center">
              {zoneSummary.status === 'ok' && (
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">OK</span>
                </div>
              )}
              {zoneSummary.status === 'pending' && (
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">Pending</span>
                </div>
              )}
              {zoneSummary.status === 'error' && (
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <span className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 block">Error</span>
                    {zoneSummary.errorMessage && (
                      <p className="text-sm text-red-700 dark:text-red-300 mt-2 break-words">
                        {zoneSummary.errorMessage}
                      </p>
                    )}
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Last valid serial: {zoneSummary.lastValidSerial}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Single NS Record Warning */}
      {(() => {
        const nsRecords = dnsRecords.filter(r => r.type === 'NS');
        return nsRecords.length === 1 ? (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 rounded-md">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  Only one nameserver configured
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  This zone currently has only one NS record. For reliability and fault tolerance, it&apos;s strongly recommended to configure at least two nameservers.
                </p>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {/* Verification Checklist */}
      <Card title="Nameserver Verification" className="p-4 sm:p-6 mb-6 sm:mb-8">
        <VerificationChecklist
          nameservers={zone.nameservers || ['ns1.javelina.cc', 'ns2.javelina.me']}
          storageKey={`zone-${zoneId}-nameserver-verification-minimized`}
        />
      </Card>

      {/* DNS Records Table */}
      <Card 
        title="DNS Records" 
        className="p-4 sm:p-6 mb-6 sm:mb-8"
        action={
          <Button
            size="sm"
            onClick={() => setShowAddRecordModal(true)}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Record
          </Button>
        }
      >
        <DNSRecordsTable
          records={dnsRecords}
          selectedRecords={selectedRecords}
          onSelectionChange={setSelectedRecords}
          onRecordClick={handleRecordClick}
          zoneName={zone.name}
          nameservers={zone.nameservers}
          soaSerial={zone.soa_serial}
          defaultTTL={zone.ttl}
        />
      </Card>

      {/* Audit Timeline — hidden for BillingContact (DNS logs not permitted) */}
      {canViewAuditLogs && (
        <CollapsibleCard 
          title="Change History" 
          className="p-4 sm:p-6 mb-6 sm:mb-8"
          storageKey={`zone-${zoneId}-changeHistory-collapsed`}
        >
          <AuditTimeline
            auditLogs={auditLogs}
            onDiffClick={setSelectedLog}
          />
        </CollapsibleCard>
      )}

      {/* Record Distribution */}
      <div className="mb-6 sm:mb-8">
        <CollapsibleCard 
          title="Record Type Distribution" 
          className="p-4 sm:p-6"
          storageKey={`zone-${zoneId}-recordDistribution-collapsed`}
        >
          <RecordDistributionChart data={zoneSummary.recordTypeCounts} />
        </CollapsibleCard>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedRecords.length}
        totalCount={dnsRecords.length}
        onSelectAll={() => setSelectedRecords(dnsRecords.map(r => r.id))}
        onClearSelection={() => setSelectedRecords([])}
        onDelete={handleBulkDelete}
      />

      {/* Edit Zone Modal */}
      <EditZoneModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        zoneName={zone.name}
        formData={editFormData}
        onFormDataChange={setEditFormData}
        soaSerial={zone.soa_serial}
        isSaving={isEditSaving}
        onSave={handleSaveZone}
      />

      {/* Delete Zone Modal */}
      <DeleteZoneModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmationInput('');
        }}
        onConfirm={handleDeleteZone}
        zoneName={zone.name}
        recordCount={zoneSummary?.totalRecords || 0}
        confirmationInput={deleteConfirmationInput}
        onConfirmationInputChange={setDeleteConfirmationInput}
        isDeleting={isDeleteSaving}
      />

      {/* Diff Viewer Modal */}
      <DiffViewer
        oldData={selectedLog?.old_data || null}
        newData={selectedLog?.new_data || null}
        tableName={selectedLog?.table_name || 'zone_records'}
        onClose={() => setSelectedLog(null)}
        isOpen={!!selectedLog}
      />

      {/* DNS Record Modals */}
      <ManageDNSRecordModal
        isOpen={showAddRecordModal}
        onClose={() => setShowAddRecordModal(false)}
        onSubmit={handleAddRecord}
        mode="add"
        zoneName={zone.name}
        existingRecords={dnsRecords}
      />

      <ManageDNSRecordModal
        isOpen={showEditRecordModal}
        onClose={() => {
          setShowEditRecordModal(false);
          setRecordToEdit(null);
        }}
        onSubmit={handleEditRecord}
        mode="edit"
        record={recordToEdit || undefined}
        zoneName={zone.name}
        existingRecords={dnsRecords}
      />

      <DNSRecordDetailModal
        isOpen={showRecordDetailModal}
        onClose={() => {
          setShowRecordDetailModal(false);
          setSelectedRecord(null);
        }}
        record={selectedRecord}
        zoneName={zone.name}
        onEdit={(record) => {
          setRecordToEdit(record);
          setShowEditRecordModal(true);
        }}
        onDelete={handleDeleteRecord}
      />

      <ConfirmationModal
        isOpen={showDeleteRecordConfirm}
        onClose={() => {
          setShowDeleteRecordConfirm(false);
          setRecordToDelete(null);
        }}
        onConfirm={confirmDeleteRecord}
        title="Delete DNS Record"
        message={`Are you sure you want to delete the ${recordToDelete?.type} record for "${recordToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Record"
        variant="danger"
        isLoading={isRecordLoading}
      />

    </div>
  );
}
