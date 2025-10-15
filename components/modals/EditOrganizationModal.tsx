'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { updateOrganization } from '@/lib/actions/organizations';
import { useToastStore } from '@/lib/toast-store';
import { useAuthStore } from '@/lib/auth-store';

interface EditOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: {
    id: string;
    name: string;
    description: string | null;
  };
}

export function EditOrganizationModal({ isOpen, onClose, organization }: EditOrganizationModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { fetchProfile } = useAuthStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; general?: string }>({});

  const { addToast } = useToastStore();

  // Pre-populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(organization.name);
      setDescription(organization.description || '');
      setErrors({});
    }
  }, [isOpen, organization.name, organization.description]);

  const validateForm = (): boolean => {
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Organization name is required';
    } else if (name.length > 100) {
      newErrors.name = 'Organization name must be 100 characters or less';
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      newErrors.name = 'Organization name can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    // Call the server action
    const result = await updateOrganization(organization.id, {
      name: name.trim(),
      description: description.trim() || undefined
    });

    // Check for errors from server action
    if (result.error) {
      setErrors({ general: result.error });
      addToast('error', result.error);
      setIsSubmitting(false);
      return;
    }

    // Success - organization updated
    const updatedOrganization = result.data!;

    // Show success toast
    addToast('success', `Organization "${updatedOrganization.name}" updated successfully!`);
    
    // Close modal
    onClose();
    
    // Invalidate React Query cache for organizations
    await queryClient.invalidateQueries({ queryKey: ['organizations'] });
    
    // Refresh user profile to update organizations list in auth store
    await fetchProfile();
    
    // Force a hard refresh of the current page
    router.refresh();
    
    // Small delay to ensure server-side cache is cleared
    setTimeout(() => {
      router.refresh();
    }, 100);
    
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Organization" size="medium">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{errors.general}</p>
          </div>
        )}

        <div>
          <label htmlFor="edit-org-name" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Organization Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="edit-org-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Company Corp"
            disabled={isSubmitting}
            className={errors.name ? 'border-red-500' : ''}
            maxLength={100}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
          <p className="mt-1 text-xs text-gray-slate">
            {name.length}/100 characters
          </p>
        </div>

        <div>
          <label htmlFor="edit-org-description" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Description
          </label>
          <textarea
            id="edit-org-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description or notes"
            disabled={isSubmitting}
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-light rounded-md focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent disabled:bg-gray-light disabled:cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-slate">
            {description.length}/500 characters
          </p>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

