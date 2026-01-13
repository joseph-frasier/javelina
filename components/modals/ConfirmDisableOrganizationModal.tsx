'use client';

import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface ConfirmDisableOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  organizationName: string;
  isDisabled: boolean;
  isLoading?: boolean;
}

export function ConfirmDisableOrganizationModal({
  isOpen,
  onClose,
  onConfirm,
  organizationName,
  isDisabled,
  isLoading = false,
}: ConfirmDisableOrganizationModalProps) {
  const title = isDisabled ? 'Enable Organization' : 'Disable Organization';
  
  const message = isDisabled
    ? `Are you sure you want to enable "${organizationName}"? Members will be able to perform all actions again.`
    : `Are you sure you want to disable "${organizationName}"? All members will be prevented from creating, editing, or deleting zones, records, and organization settings until you re-enable the organization.`;

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={message}
      variant={isDisabled ? 'info' : 'warning'}
      isLoading={isLoading}
      confirmText={isDisabled ? 'Enable' : 'Disable'}
      cancelText="Cancel"
    />
  );
}

