'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { deleteOrganization } from '@/lib/actions/organizations';
import { useToastStore } from '@/lib/toast-store';
import { useAuthStore } from '@/lib/auth-store';

interface DeleteOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: {
    id: string;
    name: string;
    environmentsCount?: number;
    zonesCount?: number;
  };
}

export function DeleteOrganizationModal({ isOpen, onClose, organization }: DeleteOrganizationModalProps) {
  const router = useRouter();
  const { fetchProfile } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useToastStore();

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    // Call the server action
    const result = await deleteOrganization(organization.id);

    // Check for errors from server action
    if (result.error) {
      setError(result.error);
      addToast('error', result.error);
      setIsDeleting(false);
      return;
    }

    // Success - organization deleted
    addToast('success', `Organization "${organization.name}" deleted successfully!`);
    
    // Refresh user profile to update organizations list in auth store
    await fetchProfile();
    
    // Redirect to home page
    router.push('/');
    router.refresh();
    
    // Close modal
    onClose();
    
    setIsDeleting(false);
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" size="small">
      <div className="space-y-6">
        {/* Warning Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Title and Description */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-orange-dark mb-2">
            Delete Organization
          </h2>
          <p className="text-gray-slate mb-4">
            Are you sure you want to delete <span className="font-bold text-orange-dark">{organization.name}</span>?
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Warning Box */}
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium mb-2">Warning</p>
              <ul className="text-sm text-red-700 space-y-1">
                {organization.environmentsCount !== undefined && organization.environmentsCount > 0 && (
                  <li>• All <strong>{organization.environmentsCount}</strong> {organization.environmentsCount === 1 ? 'environment' : 'environments'} will be deleted</li>
                )}
                {organization.zonesCount !== undefined && organization.zonesCount > 0 && (
                  <li>• All <strong>{organization.zonesCount}</strong> {organization.zonesCount === 1 ? 'zone' : 'zones'} under those environments will be deleted</li>
                )}
                <li>• This action cannot be undone</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1 bg-red-600 hover:bg-red-700"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </>
            ) : (
              'Delete Organization'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

