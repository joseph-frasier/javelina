'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import { createZone } from '@/lib/api/hierarchy';
import { useToastStore } from '@/lib/toast-store';

interface AddZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  environmentId: string;
  environmentName: string;
  organizationId: string;
  onSuccess?: (zoneId: string) => void;
}

type ZoneType = 'primary' | 'secondary' | 'redirect';

const zoneTypeOptions = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'redirect', label: 'Redirect' }
];

export function AddZoneModal({ 
  isOpen, 
  onClose, 
  environmentId, 
  environmentName,
  organizationId,
  onSuccess 
}: AddZoneModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [zoneType, setZoneType] = useState<ZoneType>('primary');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; general?: string }>({});

  const { addToast } = useToastStore();

  const validateForm = (): boolean => {
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Zone name is required';
    } else if (name.length > 253) {
      newErrors.name = 'Zone name must be 253 characters or less';
    } else if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(name)) {
      newErrors.name = 'Zone name must be a valid domain name (e.g., example.com or subdomain.example.com)';
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

    try {
      const zone = await createZone({
        name: name.trim().toLowerCase(), // Domains are case-insensitive
        zone_type: zoneType,
        description: description.trim() || undefined,
        environment_id: environmentId
      });

      // Invalidate React Query cache for zones
      await queryClient.invalidateQueries({ queryKey: ['zones', environmentId] });
      
      // Refresh the page data
      router.refresh();

      addToast('success', `Zone "${zone.name}" created successfully!`);
      
      // Reset form
      setName('');
      setZoneType('primary');
      setDescription('');
      
      // Call success callback
      if (onSuccess) {
        onSuccess(zone.id);
      }
      
      // Close modal
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create zone';
      setErrors({ general: errorMessage });
      addToast('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setZoneType('primary');
      setDescription('');
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Zone" size="medium">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{errors.general}</p>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-slate mb-4">
            Adding zone to: <span className="font-semibold text-orange-dark dark:text-white">{environmentName}</span> environment
          </p>
        </div>

        <div>
          <label htmlFor="zone-name" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Zone Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="zone-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., example.com or subdomain.example.com"
            disabled={isSubmitting}
            className={errors.name ? 'border-red-500' : ''}
            maxLength={253}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
          <p className="mt-1 text-xs text-gray-slate">
            Enter a valid domain name. {name.length}/253 characters
          </p>
        </div>

        <div>
          <label htmlFor="zone-type" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Zone Type <span className="text-red-500">*</span>
          </label>
          <Dropdown
            options={zoneTypeOptions}
            value={zoneType}
            onChange={(value) => setZoneType(value as ZoneType)}
          />
        </div>

        <div>
          <label htmlFor="zone-description" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Description
          </label>
          <textarea
            id="zone-description"
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
              'Save Zone'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

