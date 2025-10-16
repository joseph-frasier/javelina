'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import Input from '@/components/ui/Input';
import { updateEnvironment } from '@/lib/actions/environments';
import { useToastStore } from '@/lib/toast-store';

interface EditEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: {
    id: string;
    name: string;
    environment_type: 'production' | 'staging' | 'development';
    location: string | null;
    description: string | null;
    status: 'active' | 'disabled' | 'archived';
    organization_id: string;
  };
}

type EnvironmentType = 'production' | 'staging' | 'development';
type EnvironmentStatus = 'active' | 'disabled' | 'archived';

const environmentTypeOptions = [
  { value: 'production', label: 'Production' },
  { value: 'staging', label: 'Staging' },
  { value: 'development', label: 'Development' }
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
  { value: 'archived', label: 'Archived' }
];

export function EditEnvironmentModal({ isOpen, onClose, environment }: EditEnvironmentModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<EnvironmentType>('production');
  const [selectedStatus, setSelectedStatus] = useState<EnvironmentStatus>('active');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; general?: string }>({});

  const { addToast } = useToastStore();

  // Pre-populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(environment.name);
      setSelectedType(environment.environment_type);
      setSelectedStatus(environment.status);
      setLocation(environment.location || '');
      setDescription(environment.description || '');
      setErrors({});
    }
  }, [isOpen, environment]);

  const validateForm = (): boolean => {
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Environment name is required';
    } else if (name.length > 100) {
      newErrors.name = 'Environment name must be 100 characters or less';
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
    const result = await updateEnvironment(environment.id, {
      name: name.trim(),
      environment_type: selectedType,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
      status: selectedStatus
    });

    // Check for errors from server action
    if (result.error) {
      setErrors({ general: result.error });
      addToast('error', result.error);
      setIsSubmitting(false);
      return;
    }

    // Success - environment updated
    const updatedEnvironment = result.data!;

    // Show success toast
    addToast('success', `Environment "${updatedEnvironment.name}" updated successfully!`);
    
    // Close modal
    onClose();
    
    // Invalidate React Query cache for environments
    await queryClient.invalidateQueries({ queryKey: ['environments', environment.organization_id] });
    
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Environment" size="medium">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{errors.general}</p>
          </div>
        )}

        <div>
          <label htmlFor="edit-env-name" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Environment Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="edit-env-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Production US-East"
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
          <label htmlFor="edit-env-type" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Environment Type <span className="text-red-500">*</span>
          </label>
          <Dropdown
            options={environmentTypeOptions}
            value={selectedType}
            onChange={(value) => setSelectedType(value as EnvironmentType)}
          />
        </div>

<div>
          <label htmlFor="edit-env-location" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Location
          </label>
          <Input
            id="edit-env-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., US East (N. Virginia)"
            disabled={isSubmitting}
            maxLength={100}
          />
        </div>

        <div>
          <label htmlFor="edit-env-description" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Description
          </label>
          <textarea
            id="edit-env-description"
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

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-orange-dark dark:text-white">
            Active Status <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setSelectedStatus(selectedStatus === 'active' ? 'disabled' : 'active')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              selectedStatus === 'active' ? 'bg-orange' : 'bg-gray-light'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                selectedStatus === 'active' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-light">
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

