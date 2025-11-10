'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { createOrganization } from '@/lib/actions/organizations';
import { organizationsApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { useAuthStore } from '@/lib/auth-store';
import type { Plan } from '@/lib/plans-config';

interface AddOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (organizationId: string) => void;
  selectedPlan?: Plan | null; // Optional plan for billing integration
}

export function AddOrganizationModal({ isOpen, onClose, onSuccess, selectedPlan }: AddOrganizationModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { fetchProfile } = useAuthStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; general?: string }>({});

  const { addToast } = useToastStore();

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

    try {
      let organizationId: string;
      let organizationName: string;

      // If a plan is selected, create organization with plan through Express API
      if (selectedPlan) {
        try {
          const data = await organizationsApi.create({
            name: name.trim(),
            description: description.trim() || undefined,
            plan_code: selectedPlan.code,
          });

          organizationId = data.id;
          organizationName = data.name;
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to create organization';
          setErrors({ general: errorMessage });
          addToast('error', errorMessage);
          setIsSubmitting(false);
          return;
        }
      } else {
        // No plan selected - use the standard server action
        const result = await createOrganization({
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

        organizationId = result.data!.id;
        organizationName = result.data!.name;
      }

      // Invalidate React Query cache for organizations
      await queryClient.invalidateQueries({ queryKey: ['organizations'] });
      
      // Refresh user profile to update organizations list in auth store
      await fetchProfile();
      
      // Refresh the page data
      router.refresh();

      addToast('success', `Organization "${organizationName}" created successfully!`);
      
      // Reset form
      setName('');
      setDescription('');
      
      // Call success callback with organization ID
      if (onSuccess) {
        onSuccess(organizationId);
      }
      
      // Close modal
      onClose();
      
      setIsSubmitting(false);
    } catch (error: any) {
      console.error('Error creating organization:', error);
      setErrors({ general: error.message || 'An unexpected error occurred' });
      addToast('error', 'Failed to create organization');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      // Call onClose first to start the animation
      onClose();
      // Clear form state after animation completes (200ms)
      setTimeout(() => {
        setName('');
        setDescription('');
        setErrors({});
      }, 250);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={selectedPlan ? `Create Organization - ${selectedPlan.name} Plan` : "Add Organization"} 
      size="medium"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {selectedPlan && (
          <div className="p-4 bg-orange-light border border-orange rounded-lg">
            <div className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 text-orange flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-dark">
                  Selected Plan: {selectedPlan.name}
                </p>
                <p className="text-xs text-gray-slate mt-1">
                  {selectedPlan.description}
                  {selectedPlan.monthly && selectedPlan.monthly.amount > 0 && (
                    <> • ${selectedPlan.monthly.amount.toFixed(2)}/month</>
                  )}
                  {selectedPlan.monthly && selectedPlan.monthly.amount === 0 && (
                    <> • Free forever</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{errors.general}</p>
          </div>
        )}

        <div>
          <label htmlFor="org-name" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Organization Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="org-name"
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
          <label htmlFor="org-description" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Description
          </label>
          <textarea
            id="org-description"
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
              'Save Organization'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

