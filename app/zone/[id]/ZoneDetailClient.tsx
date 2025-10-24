'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Modal } from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { OrganizationDetail, EnvironmentDetail } from '@/lib/mock-hierarchy-data';
import { RecordDistributionChart } from '@/components/dns/RecordDistributionChart';
import { TTLHeatmap } from '@/components/dns/TTLHeatmap';
import { VerificationChecklist } from '@/components/dns/VerificationChecklist';
import { AuditTimeline } from '@/components/dns/AuditTimeline';
import { DiffViewer } from '@/components/dns/DiffViewer';
import { VerificationStatusBadge, HealthStatusBadge, LastDeployedBadge } from '@/components/dns/StatusBadges';
import Dropdown from '@/components/ui/Dropdown';
import { updateZone } from '@/lib/actions/zones';
import { useToastStore } from '@/lib/toast-store';
import { 
  getZoneSummary, 
  getZoneAuditLogs, 
  verifyZoneNameservers, 
  exportZoneJSON,
  getZoneDNSRecords,
  ZoneSummary
} from '@/lib/api/dns';
import { AuditLog, DNSRecord } from '@/lib/mock-dns-data';

interface ZoneDetailClientProps {
  zone: any;
  zoneId: string;
  organization?: OrganizationDetail | null;
  environment?: EnvironmentDetail | null;
}

export function ZoneDetailClient({ zone, zoneId, organization, environment }: ZoneDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const [zoneSummary, setZoneSummary] = useState<ZoneSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Edit form state
  const [editFormData, setEditFormData] = useState({
    name: zone.name || '',
    zone_type: zone.zone_type || 'primary',
    description: zone.description || '',
    active: zone.active ?? true,
    nameservers: zone.nameservers ? zone.nameservers.join('\n') : '',
  });
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [showTypeChangeConfirm, setShowTypeChangeConfirm] = useState(false);
  const [newZoneType, setNewZoneType] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      const [summary, logs, records] = await Promise.all([
        getZoneSummary(zoneId, zone.name, zone.records_count || 50),
        getZoneAuditLogs(zoneId, zone.name),
        getZoneDNSRecords(zoneId, zone.name),
      ]);
      setZoneSummary(summary);
      setAuditLogs(logs);
      setDnsRecords(records);
    };
    loadData();
  }, [zoneId, zone.name, zone.records_count]);

  const handleVerify = async () => {
    setIsVerifying(true);
    const result = await verifyZoneNameservers(zoneId);
    
    // Reload summary after verification
    const newSummary = await getZoneSummary(zoneId, zone.name, zone.records_count || 50);
    setZoneSummary(newSummary);
    setIsVerifying(false);
    
    alert(result.message);
  };

  const handleExport = async () => {
    await exportZoneJSON(zoneId, zone.name);
  };

  const handleZoneTypeChange = (newType: string) => {
    if (newType !== editFormData.zone_type) {
      setNewZoneType(newType);
      setShowTypeChangeConfirm(true);
    }
  };

  const confirmTypeChange = () => {
    if (newZoneType) {
      setEditFormData({ ...editFormData, zone_type: newZoneType });
    }
    setShowTypeChangeConfirm(false);
    setNewZoneType(null);
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
        zone_type: editFormData.zone_type as 'primary' | 'secondary' | 'redirect',
        description: editFormData.description,
        active: editFormData.active,
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
      
      // Invalidate React Query cache to update sidebar
      if (zone.environment_id) {
        await queryClient.invalidateQueries({ queryKey: ['zones', zone.environment_id] });
      }
      
      // Soft refresh to update data without losing toast
      router.refresh();
    } catch (error) {
      addToast('error', `Error saving zone: ${error}`);
      setIsEditSaving(false);
    }
  };

  const handleDeleteZone = () => {
    alert(`Zone ${zone.name} deleted successfully! (Mock operation)\nIn a real app, you would be redirected to the zones list.`);
    setShowDeleteModal(false);
  };

  // Build breadcrumb items
  const breadcrumbItems = [];
  if (organization && environment) {
    breadcrumbItems.push(
      { label: organization.name, href: `/organization/${organization.id}` },
      { label: environment.name, href: `/organization/${organization.id}/environment/${environment.id}` },
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
              <VerificationStatusBadge status={zoneSummary.verificationStatus} />
              <HealthStatusBadge status={zoneSummary.healthStatus} />
              <LastDeployedBadge timestamp={zoneSummary.lastDeployedAt} />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-shrink-0">
            <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)} className="justify-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteModal(true)} className="!bg-red-600 hover:!bg-red-700 !text-white justify-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </Button>
            <Button variant="primary" size="sm" onClick={() => window.location.reload()} className="justify-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reload
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card title="Total Records" className="p-4 sm:p-6">
          <p className="text-2xl sm:text-3xl font-bold text-orange dark:text-orange">{zoneSummary.totalRecords}</p>
          <p className="text-sm text-gray-slate dark:text-gray-400 mt-1">{zoneSummary.recordTypeCounts.length} record types</p>
        </Card>
        <Card title="Verification" className="p-4 sm:p-6">
          <p className="text-2xl sm:text-3xl font-bold text-orange dark:text-orange capitalize">{zoneSummary.verificationStatus}</p>
          <p className="text-sm text-gray-slate dark:text-gray-400 mt-1">
            {zoneSummary.lastVerifiedAt ? new Date(zoneSummary.lastVerifiedAt).toLocaleDateString() : 'Never verified'}
          </p>
        </Card>
        <Card title="Health Status" className="p-4 sm:p-6">
          <p className="text-2xl sm:text-3xl font-bold text-orange dark:text-orange capitalize">{zoneSummary.healthStatus}</p>
          <p className="text-sm text-gray-slate dark:text-gray-400 mt-1">Current status</p>
        </Card>
        <Card title="Last Deployed" className="p-4 sm:p-6">
          <p className="text-2xl sm:text-3xl font-bold text-orange dark:text-orange">
            {zoneSummary.lastDeployedAt ? new Date(zoneSummary.lastDeployedAt).toLocaleDateString() : 'Never'}
          </p>
          <p className="text-sm text-gray-slate dark:text-gray-400 mt-1">Deployment date</p>
        </Card>
      </div>

      {/* Record Distribution and TTL Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card title="Record Type Distribution" className="p-4 sm:p-6">
          <RecordDistributionChart data={zoneSummary.recordTypeCounts} />
        </Card>
        <Card title="TTL Distribution" className="p-4 sm:p-6">
          <TTLHeatmap data={zoneSummary.ttlDistribution} />
        </Card>
      </div>

      {/* Verification Checklist */}
      <Card title="Nameserver Verification" className="p-4 sm:p-6 mb-6 sm:mb-8">
        <VerificationChecklist
          nameservers={zone.nameservers || ['ns1.example.com', 'ns2.example.com']}
          verificationStatus={zoneSummary.verificationStatus}
          lastVerifiedAt={zoneSummary.lastVerifiedAt}
        />
      </Card>

      {/* Audit Timeline */}
      <Card title="Change History" className="p-4 sm:p-6 mb-6 sm:mb-8">
        <AuditTimeline
          auditLogs={auditLogs}
          onDiffClick={setSelectedLog}
        />
      </Card>

      {/* DNS Records Table */}
      <Card title="DNS Records" className="p-4 sm:p-6 mb-6 sm:mb-8">
        {/* Mobile Card View - Below 640px */}
        <div className="sm:hidden space-y-3">
          {dnsRecords.slice(0, 10).map((record) => (
            <div key={record.id} className="p-4 border border-gray-light dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
              <div className="flex items-start justify-between mb-3">
                <div className="font-semibold text-orange-dark dark:text-orange break-words flex-1 text-sm">{record.name}</div>
                <span className="ml-2 px-2 py-1 bg-blue-electric/10 dark:bg-blue-electric/20 text-blue-electric dark:text-blue-electric rounded text-xs font-medium flex-shrink-0">
                  {record.type}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">Value:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-mono text-xs break-all text-right">{record.value}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">TTL:</span>
                  <span className="text-gray-900 dark:text-gray-100">{record.ttl}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    record.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {record.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {dnsRecords.length > 10 && (
            <div className="mt-4 text-center text-sm text-gray-slate dark:text-gray-400">
              Showing 10 of {dnsRecords.length} records
            </div>
          )}
        </div>

        {/* Desktop Table - 640px+ */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-light dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-slate dark:text-gray-400">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-slate dark:text-gray-400">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-slate dark:text-gray-400">Value</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-slate dark:text-gray-400">TTL</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-slate dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {dnsRecords.slice(0, 10).map((record) => (
                <tr key={record.id} className="border-b border-gray-light dark:border-gray-700 hover:bg-gray-light/30 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-orange-dark dark:text-orange">{record.name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-blue-electric/10 dark:bg-blue-electric/20 text-blue-electric dark:text-blue-electric rounded text-xs font-medium">
                      {record.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-slate dark:text-gray-300 font-mono truncate max-w-md">{record.value}</td>
                  <td className="py-3 px-4 text-sm text-gray-slate dark:text-gray-300">{record.ttl}s</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      record.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {dnsRecords.length > 10 && (
            <div className="mt-4 text-center text-sm text-gray-slate dark:text-gray-400">
              Showing 10 of {dnsRecords.length} records
            </div>
          )}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pb-6 sm:pb-8">
        <Button variant="outline" size="sm" disabled className="justify-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save Draft
        </Button>
        <Button variant="outline" size="sm" disabled className="justify-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Deploy Now
        </Button>
        <Button 
          variant="secondary" 
          size="sm"
          onClick={handleVerify}
          disabled={isVerifying}
          className="justify-center"
        >
          {isVerifying ? (
            <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {isVerifying ? 'Verifying...' : 'Re-verify'}
        </Button>
        <Button variant="secondary" size="sm" onClick={handleExport} className="justify-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Zone JSON
        </Button>
      </div>

      {/* Edit Zone Modal */}
      {/* Type Change Confirmation Modal */}
      {showTypeChangeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-slate rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-orange-dark mb-4">Confirm Zone Type Change</h3>
              <p className="text-gray-slate mb-6">
                Changing the zone type from <span className="font-semibold">{editFormData.zone_type}</span> to <span className="font-semibold">{newZoneType}</span> may affect DNS resolution. Are you sure?
              </p>
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="secondary"
                  onClick={() => { setShowTypeChangeConfirm(false); setNewZoneType(null); }}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={confirmTypeChange}>
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Zone Modal */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        title={`Edit Zone: ${zone.name}`}
        size="large"
      >
        <div className="space-y-6">
          {/* Zone Name */}
          <div>
            <label className="block text-sm font-medium text-orange-dark dark:text-white mb-2">Zone Name <span className="text-red-600">*</span></label>
            <Input
              type="text"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              placeholder="e.g., example.com"
            />
          </div>

          {/* Zone Type */}
          <div>
            <label className="block text-sm font-medium text-orange-dark dark:text-white mb-2">Zone Type <span className="text-red-600">*</span></label>
            <Dropdown
              options={[
                { value: 'primary', label: 'Primary' },
                { value: 'secondary', label: 'Secondary' },
                { value: 'redirect', label: 'Redirect' },
              ]}
              value={editFormData.zone_type}
              onChange={(value) => handleZoneTypeChange(value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-orange-dark dark:text-white mb-2">Description</label>
            <textarea
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              placeholder="Zone description (optional)"
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 text-orange-dark dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent disabled:bg-gray-light disabled:cursor-not-allowed"
            />
          </div>

          {/* Nameservers */}
          <div>
            <label className="block text-sm font-medium text-orange-dark dark:text-white mb-2">Nameservers</label>
            <textarea
              value={editFormData.nameservers}
              onChange={(e) => setEditFormData({ ...editFormData, nameservers: e.target.value })}
              placeholder="One nameserver per line (e.g., ns1.example.com)"
              rows={4}
              className="w-full px-3 py-2 rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 text-orange-dark dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent font-mono text-xs disabled:bg-gray-light disabled:cursor-not-allowed"
            />
          </div>

          {/* Active Status Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-orange-dark dark:text-white">Active Status <span className="text-red-600">*</span></label>
            <button
              onClick={() => setEditFormData({ ...editFormData, active: !editFormData.active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                editFormData.active ? 'bg-orange' : 'bg-gray-light'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  editFormData.active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-light">
          <Button 
            variant="secondary"
            onClick={() => setShowEditModal(false)} 
            disabled={isEditSaving}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveZone} disabled={isEditSaving}>
            {isEditSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Modal>

      {/* Delete Zone Modal */}
      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)} 
        title="Delete Zone"
        size="small"
      >
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-slate dark:text-gray-400 mb-6">
            Are you sure you want to delete <span className="font-bold text-orange-dark dark:text-white">{zone.name}</span>?
            This action cannot be undone and will delete all {zoneSummary.totalRecords} DNS records.
          </p>
          <div className="flex space-x-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={handleDeleteZone}
            >
              Delete Zone
            </Button>
          </div>
        </div>
      </Modal>

      {/* Diff Viewer Modal */}
      {selectedLog && (
        <DiffViewer
          oldData={selectedLog.old_data}
          newData={selectedLog.new_data}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
