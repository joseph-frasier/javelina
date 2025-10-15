'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { deleteEnvironment } from '@/lib/actions/environments';
import { useToastStore } from '@/lib/toast-store';
import { useAuthStore } from '@/lib/auth-store';

interface DeleteEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: {
    id: string;
    name: string;
    organization_id: string;
  };
  organizationId: string;
  zonesCount?: number;
}

export function DeleteEnvironmentModal({ 
  isOpen, 
  onClose, 
  environment,
  organizationId,
  zonesCount = 0 
}: DeleteEnvironmentModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { fetchProfile } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useToastStore();

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    // Call the server action
    const result = await deleteEnvironment(environment.id, organizationId);

    // Check for errors from server action
    if (result.error) {
      setError(result.error);
      addToast('error', result.error);
      setIsDeleting(false);
      return;
    }

    // Success - environment deleted
    addToast('success', `Environment "${environment.name}" deleted successfully!`);
    
    // Invalidate React Query cache for environments
    await queryClient.invalidateQueries({ queryKey: ['environments', organizationId] });
    await queryClient.invalidateQueries({ queryKey: ['organizations'] });
    
    // Refresh user profile to update organizations/environments list in auth store
    await fetchProfile();
    
    // Close modal
    onClose();
    
    // Redirect to organization page
    router.push(`/organization/${organizationId}`);
    router.refresh();
    
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
            Delete Environment
          </h2>
          <p className="text-gray-slate mb-4">
            Are you sure you want to delete <span className="font-bold text-orange-dark">{environment.name}</span>?
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
                {zonesCount > 0 && (
                  <li>• All <strong>{zonesCount}</strong> {zonesCount === 1 ? 'zone' : 'zones'} in this environment will be deleted</li>
                )}
                <li>• All DNS records in those zones will be deleted</li>
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
              'Delete Environment'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

