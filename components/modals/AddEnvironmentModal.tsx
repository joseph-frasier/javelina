'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import Input from '@/components/ui/Input';
import { createEnvironment } from '@/lib/actions/environments';
import { useToastStore } from '@/lib/toast-store';

interface AddEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  onSuccess?: (environmentId: string) => void;
}

type EnvironmentType = 'production' | 'staging' | 'development';

const environmentOptions = [
  { value: 'production', label: 'Production' },
  { value: 'staging', label: 'Staging' },
  { value: 'development', label: 'Development' }
];

export function AddEnvironmentModal({ 
  isOpen, 
  onClose, 
  organizationId, 
  organizationName,
  onSuccess 
}: AddEnvironmentModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentType>('production');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; general?: string }>({});

  const { addToast } = useToastStore();

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
    const result = await createEnvironment({
      name: name.trim(),
      environment_type: selectedEnvironment,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
      organization_id: organizationId
    });

    // Check for errors from server action
    if (result.error) {
      setErrors({ general: result.error });
      addToast('error', result.error);
      setIsSubmitting(false);
      return;
    }

    // Success - environment created
    const environment = result.data!;

    // Invalidate React Query cache
    await queryClient.invalidateQueries({ queryKey: ['environments', organizationId] });
    
    // Refresh the page data
    router.refresh();

    addToast('success', `Environment "${environment.name}" created successfully!`);
    
    // Reset form
    setName('');
    setSelectedEnvironment('production');
    setLocation('');
    setDescription('');
    
    // Call success callback
    if (onSuccess) {
      onSuccess(environment.id);
    }
    
    // Close modal
    onClose();
    
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      // Call onClose first to start the animation
      onClose();
      // Clear form state after animation completes (200ms)
      setTimeout(() => {
        setName('');
        setSelectedEnvironment('production');
        setLocation('');
        setDescription('');
        setErrors({});
      }, 250);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Environment" size="medium">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{errors.general}</p>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-slate mb-4">
            Adding environment to: <span className="font-semibold text-orange-dark dark:text-white">{organizationName}</span>
          </p>
        </div>

        <div>
          <label htmlFor="env-name" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Environment Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="env-name"
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
        </div>

        <div>
          <label htmlFor="env-type" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Environment Type <span className="text-red-500">*</span>
          </label>
          <Dropdown
            options={environmentOptions}
            value={selectedEnvironment}
            onChange={(value) => setSelectedEnvironment(value as EnvironmentType)}
          />
        </div>

        <div>
          <label htmlFor="env-location" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Location
          </label>
          <Input
            id="env-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., US East (N. Virginia)"
            disabled={isSubmitting}
            maxLength={100}
          />
        </div>

        <div>
          <label htmlFor="env-description" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Description
          </label>
          <textarea
            id="env-description"
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
                Creating...
              </>
            ) : (
              'Save Environment'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

