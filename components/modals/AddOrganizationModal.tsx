'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import { createOrganization } from '@/lib/actions/organizations';
import { organizationsApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { useAuthStore } from '@/lib/auth-store';
import type { Plan } from '@/lib/plans-config';
import {
  validateBillingContactFields,
  formatUSPhone,
  normalizePhoneInput,
  US_STATES,
  type BillingValidationErrors,
} from '@/lib/utils/billing-validation';

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
  
  // Billing contact fields
  const [billingPhone, setBillingPhone] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const [adminContactEmail, setAdminContactEmail] = useState('');
  const [adminContactPhone, setAdminContactPhone] = useState('');
  const [copyBillingEmail, setCopyBillingEmail] = useState(false);
  const [copyBillingPhone, setCopyBillingPhone] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ 
    name?: string; 
    general?: string;
  } & BillingValidationErrors>({});

  const { addToast } = useToastStore();

  const validateForm = (): boolean => {
    const newErrors: { name?: string } & BillingValidationErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Organization name is required';
    } else if (name.length > 100) {
      newErrors.name = 'Organization name must be 100 characters or less';
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      newErrors.name = 'Organization name can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    // Validate billing contact fields
    const billingErrors = validateBillingContactFields({
      billing_phone: billingPhone,
      billing_email: billingEmail,
      billing_address: billingAddress,
      billing_city: billingCity,
      billing_state: billingState,
      billing_zip: billingZip,
      admin_contact_email: adminContactEmail,
      admin_contact_phone: adminContactPhone,
    });

    Object.assign(newErrors, billingErrors);

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
            billing_phone: formatUSPhone(billingPhone),
            billing_email: billingEmail.trim(),
            billing_address: billingAddress.trim(),
            billing_city: billingCity.trim(),
            billing_state: billingState.toUpperCase(),
            billing_zip: billingZip.trim(),
            admin_contact_email: adminContactEmail.trim(),
            admin_contact_phone: formatUSPhone(adminContactPhone),
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
          description: description.trim() || undefined,
          billing_phone: formatUSPhone(billingPhone),
          billing_email: billingEmail.trim(),
          billing_address: billingAddress.trim(),
          billing_city: billingCity.trim(),
          billing_state: billingState.toUpperCase(),
          billing_zip: billingZip.trim(),
          admin_contact_email: adminContactEmail.trim(),
          admin_contact_phone: formatUSPhone(adminContactPhone),
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
        setBillingPhone('');
        setBillingEmail('');
        setBillingAddress('');
        setBillingCity('');
        setBillingState('');
        setBillingZip('');
        setAdminContactEmail('');
        setAdminContactPhone('');
        setCopyBillingEmail(false);
        setErrors({});
      }, 250);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={selectedPlan ? `Create Organization - ${selectedPlan.name} Plan` : "Add Organization"} 
      size="large"
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

        {/* Billing Contact Section */}
        <div className="pt-4">
          <h3 className="text-base font-semibold text-orange-dark mb-4">Billing Contact Information</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="billing-email" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                Billing Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="billing-email"
                type="email"
                value={billingEmail}
                onChange={(e) => {
                  setBillingEmail(e.target.value);
                  if (copyBillingEmail) {
                    setAdminContactEmail(e.target.value);
                  }
                }}
                placeholder="billing@example.com"
                disabled={isSubmitting}
                className={errors.billing_email ? 'border-red-500' : ''}
              />
              {errors.billing_email && (
                <p className="mt-1 text-sm text-red-600">{errors.billing_email}</p>
              )}
            </div>

            <div>
              <label htmlFor="billing-phone" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                Billing Phone <span className="text-red-500">*</span>
              </label>
              <Input
                id="billing-phone"
                type="tel"
                value={billingPhone}
                onChange={(e) => {
                  const normalized = normalizePhoneInput(e.target.value);
                  setBillingPhone(normalized);
                  if (copyBillingPhone) {
                    setAdminContactPhone(normalized);
                  }
                }}
                onBlur={(e) => {
                  const formatted = formatUSPhone(e.target.value);
                  if (formatted !== e.target.value) {
                    setBillingPhone(formatted);
                    if (copyBillingPhone) {
                      setAdminContactPhone(formatted);
                    }
                  }
                }}
                placeholder="(555) 123-4567"
                disabled={isSubmitting}
                className={errors.billing_phone ? 'border-red-500' : ''}
              />
              {errors.billing_phone && (
                <p className="mt-1 text-sm text-red-600">{errors.billing_phone}</p>
              )}
              <p className="mt-1 text-xs text-gray-slate">
                Format: (XXX) XXX-XXXX or XXX-XXX-XXXX
              </p>
            </div>

            <div>
              <label htmlFor="billing-address" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                Billing Address <span className="text-red-500">*</span>
              </label>
              <Input
                id="billing-address"
                type="text"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="123 Main Street"
                disabled={isSubmitting}
                className={errors.billing_address ? 'border-red-500' : ''}
              />
              {errors.billing_address && (
                <p className="mt-1 text-sm text-red-600">{errors.billing_address}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="billing-city" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <Input
                  id="billing-city"
                  type="text"
                  value={billingCity}
                  onChange={(e) => setBillingCity(e.target.value)}
                  placeholder="San Francisco"
                  disabled={isSubmitting}
                  className={errors.billing_city ? 'border-red-500' : ''}
                />
                {errors.billing_city && (
                  <p className="mt-1 text-sm text-red-600">{errors.billing_city}</p>
                )}
              </div>

              <div>
                <label htmlFor="billing-state" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <Dropdown
                  value={billingState}
                  options={[
                    { value: '', label: 'Select State' },
                    ...US_STATES.map((state) => ({
                      value: state.code,
                      label: state.name,
                    })),
                  ]}
                  onChange={(value) => setBillingState(value)}
                  disabled={isSubmitting}
                  className={errors.billing_state ? '[&_button]:border-red-500' : ''}
                />
                {errors.billing_state && (
                  <p className="mt-1 text-sm text-red-600">{errors.billing_state}</p>
                )}
              </div>
            </div>

            <div className="w-1/2 pr-2">
              <label htmlFor="billing-zip" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                ZIP Code <span className="text-red-500">*</span>
              </label>
              <Input
                id="billing-zip"
                type="text"
                value={billingZip}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                  setBillingZip(value);
                }}
                placeholder="94102"
                maxLength={5}
                disabled={isSubmitting}
                className={errors.billing_zip ? 'border-red-500' : ''}
              />
              {errors.billing_zip && (
                <p className="mt-1 text-sm text-red-600">{errors.billing_zip}</p>
              )}
            </div>
          </div>
        </div>

        {/* Admin Contact Section */}
        <div className="pt-4">
          <h3 className="text-base font-semibold text-orange-dark mb-4">Administrative Contact</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                Admin Contact Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="admin-email"
                type="email"
                value={adminContactEmail}
                onChange={(e) => setAdminContactEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled={isSubmitting || copyBillingEmail}
                className={errors.admin_contact_email ? 'border-red-500' : ''}
              />
              {errors.admin_contact_email && (
                <p className="mt-1 text-sm text-red-600">{errors.admin_contact_email}</p>
              )}
              <div className="mt-2">
                <label className="flex items-center text-sm text-gray-slate">
                  <input
                    type="checkbox"
                    checked={copyBillingEmail}
                    onChange={(e) => {
                      setCopyBillingEmail(e.target.checked);
                      if (e.target.checked) {
                        setAdminContactEmail(billingEmail);
                      }
                    }}
                    disabled={isSubmitting}
                    className="mr-2"
                  />
                  Same as billing email
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="admin-phone" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                Admin Contact Phone <span className="text-red-500">*</span>
              </label>
              <Input
                id="admin-phone"
                type="tel"
                value={adminContactPhone}
                onChange={(e) => setAdminContactPhone(normalizePhoneInput(e.target.value))}
                onBlur={(e) => {
                  const formatted = formatUSPhone(e.target.value);
                  if (formatted !== e.target.value) {
                    setAdminContactPhone(formatted);
                  }
                }}
                placeholder="(555) 123-4567"
                disabled={isSubmitting || copyBillingPhone}
                className={errors.admin_contact_phone ? 'border-red-500' : ''}
              />
              {errors.admin_contact_phone && (
                <p className="mt-1 text-sm text-red-600">{errors.admin_contact_phone}</p>
              )}
              <p className="mt-1 text-xs text-gray-slate">
                Format: (XXX) XXX-XXXX or XXX-XXX-XXXX
              </p>
              <div className="mt-2">
                <label className="flex items-center text-sm text-gray-slate">
                  <input
                    type="checkbox"
                    checked={copyBillingPhone}
                    onChange={(e) => {
                      setCopyBillingPhone(e.target.checked);
                      if (e.target.checked) {
                        setAdminContactPhone(billingPhone);
                      }
                    }}
                    disabled={isSubmitting}
                    className="mr-2"
                  />
                  Same as billing phone
                </label>
              </div>
            </div>
          </div>
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

