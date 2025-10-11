'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
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

export function AddZoneModal({ 
  isOpen, 
  onClose, 
  environmentId, 
  environmentName,
  organizationId,
  onSuccess 
}: AddZoneModalProps) {
  const [name, setName] = useState('');
  const [dataConfiguration, setDataConfiguration] = useState('');
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
        data_configuration: dataConfiguration.trim() || undefined,
        environment_id: environmentId,
        organization_id: organizationId
      });

      addToast('success', `Zone "${zone.name}" created successfully!`);
      
      // Reset form
      setName('');
      setDataConfiguration('');
      
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
      setDataConfiguration('');
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
          <label htmlFor="zone-config" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Data Configuration
          </label>
          <textarea
            id="zone-config"
            value={dataConfiguration}
            onChange={(e) => setDataConfiguration(e.target.value)}
            placeholder="Optional data configuration details"
            disabled={isSubmitting}
            rows={4}
            maxLength={1000}
            className="w-full px-3 py-2 border border-gray-light rounded-md focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent disabled:bg-gray-light disabled:cursor-not-allowed font-mono text-sm"
          />
          <p className="mt-1 text-xs text-gray-slate">
            {dataConfiguration.length}/1000 characters
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

