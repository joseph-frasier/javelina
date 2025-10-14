'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { createEnvironment } from '@/lib/api/hierarchy';
import { useToastStore } from '@/lib/toast-store';

interface AddEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  onSuccess?: (environmentId: string) => void;
}

type EnvironmentType = 'Production' | 'Staging' | 'Development';

const environmentOptions = [
  { value: 'Production', label: 'Production' },
  { value: 'Staging', label: 'Staging' },
  { value: 'Development', label: 'Development' }
];

export function AddEnvironmentModal({ 
  isOpen, 
  onClose, 
  organizationId, 
  organizationName,
  onSuccess 
}: AddEnvironmentModalProps) {
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentType>('Production');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ general?: string }>({});

  const { addToast } = useToastStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setErrors({});

    try {
      const environment = await createEnvironment({
        name: selectedEnvironment,
        description: description.trim() || undefined,
        organization_id: organizationId
      });

      addToast('success', `${environment.name} environment created successfully!`);
      
      // Reset form
      setSelectedEnvironment('Production');
      setDescription('');
      
      // Call success callback
      if (onSuccess) {
        onSuccess(environment.id);
      }
      
      // Close modal
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create environment';
      setErrors({ general: errorMessage });
      addToast('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedEnvironment('Production');
      setDescription('');
      setErrors({});
      onClose();
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
            disabled={isSubmitting}
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

