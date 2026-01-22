'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { adminApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { formatDateWithRelative } from '@/lib/utils/time';

interface OrganizationDetails {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
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
}

interface ViewOrganizationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName?: string;
  organizationData?: OrganizationDetails | null;
}

export function ViewOrganizationDetailsModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  organizationData,
}: ViewOrganizationDetailsModalProps) {
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<OrganizationDetails | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (organizationData) {
        // Use pre-fetched data
        setOrganization(organizationData);
        setLoading(false);
      } else if (organizationId) {
        // Fetch if no data provided
        fetchOrganizationDetails();
      }
    }
  }, [isOpen, organizationId, organizationData]);

  const fetchOrganizationDetails = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getOrganization(organizationId);
      setOrganization(data as OrganizationDetails);
    } catch (error: any) {
      console.error('Failed to fetch organization details:', error);
      addToast('error', error.message || 'Failed to load organization details');
    } finally {
      setLoading(false);
    }
  };

  const InfoRow = ({ label, value }: { label: string; value: string | number | undefined | null }) => {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    
    return (
      <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-light dark:border-gray-700 last:border-b-0">
        <div className="col-span-1 text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </div>
        <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100">
          {value}
        </div>
      </div>
    );
  };

  const StatusBadge = ({ isActive }: { isActive: boolean }) => (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
        isActive
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-600' : 'bg-red-600'}`} />
      {isActive ? 'Enabled' : 'Disabled'}
    </span>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={organizationName || 'Organization Details'}
      size="large"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
            <p className="text-gray-slate dark:text-gray-300 mt-4">Loading organization details...</p>
          </div>
        ) : organization ? (
          <>
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-orange-dark dark:text-orange mb-4">
                Basic Information
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <InfoRow label="Name" value={organization.name} />
                <InfoRow label="Description" value={organization.description} />
                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-light dark:border-gray-700 last:border-b-0">
                  <div className="col-span-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Status
                  </div>
                  <div className="col-span-2">
                    <StatusBadge isActive={organization.is_active !== false} />
                  </div>
                </div>
                <InfoRow 
                  label="Created" 
                  value={organization.created_at ? formatDateWithRelative(organization.created_at).absolute : undefined} 
                />
              </div>
            </div>

            {/* Usage Statistics */}
            <div>
              <h3 className="text-lg font-semibold text-orange-dark dark:text-orange mb-4">
                Usage Statistics
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-dark dark:text-orange">
                      {organization.member_count || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-dark dark:text-orange">
                      {organization.zone_count || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Zones</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-dark dark:text-orange">
                      {organization.record_count || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Records</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Information */}
            {(organization.billing_email || organization.billing_phone || organization.billing_address) && (
              <div>
                <h3 className="text-lg font-semibold text-orange-dark dark:text-orange mb-4">
                  Billing Information
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <InfoRow label="Billing Email" value={organization.billing_email} />
                  <InfoRow label="Billing Phone" value={organization.billing_phone} />
                  <InfoRow label="Address" value={organization.billing_address} />
                  <InfoRow label="City" value={organization.billing_city} />
                  <InfoRow label="State" value={organization.billing_state} />
                  <InfoRow label="ZIP Code" value={organization.billing_zip} />
                </div>
              </div>
            )}

            {/* Admin Contact Information */}
            {(organization.admin_contact_email || organization.admin_contact_phone) && (
              <div>
                <h3 className="text-lg font-semibold text-orange-dark dark:text-orange mb-4">
                  Administrative Contact
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <InfoRow label="Admin Email" value={organization.admin_contact_email} />
                  <InfoRow label="Admin Phone" value={organization.admin_contact_phone} />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center">
            <p className="text-gray-slate dark:text-gray-300">Failed to load organization details</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

