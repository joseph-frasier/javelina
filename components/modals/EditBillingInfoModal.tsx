'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { organizationsApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import {
  validateBillingContactFields,
  formatUSPhone,
  normalizePhoneInput,
  US_STATES,
  type BillingValidationErrors,
} from '@/lib/utils/billing-validation';

interface EditBillingInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  currentData?: {
    billing_phone?: string | null;
    billing_email?: string | null;
    billing_address?: string | null;
    billing_city?: string | null;
    billing_state?: string | null;
    billing_zip?: string | null;
    admin_contact_email?: string | null;
    admin_contact_phone?: string | null;
  };
  onSuccess?: () => void;
}

export function EditBillingInfoModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  currentData,
  onSuccess,
}: EditBillingInfoModalProps) {
  const { addToast } = useToastStore();
  
  // Form state
  const [billingPhone, setBillingPhone] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const [adminContactEmail, setAdminContactEmail] = useState('');
  const [adminContactPhone, setAdminContactPhone] = useState('');
  const [copyBillingEmail, setCopyBillingEmail] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<BillingValidationErrors>({});

  // Populate form with current data when modal opens
  useEffect(() => {
    if (isOpen && currentData) {
      setBillingPhone(currentData.billing_phone || '');
      setBillingEmail(currentData.billing_email || '');
      setBillingAddress(currentData.billing_address || '');
      setBillingCity(currentData.billing_city || '');
      setBillingState(currentData.billing_state || '');
      setBillingZip(currentData.billing_zip || '');
      setAdminContactEmail(currentData.admin_contact_email || '');
      setAdminContactPhone(currentData.admin_contact_phone || '');
    }
  }, [isOpen, currentData]);

  const validateForm = (): boolean => {
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

    setErrors(billingErrors);
    return Object.keys(billingErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await organizationsApi.update(organizationId, {
        billing_phone: formatUSPhone(billingPhone),
        billing_email: billingEmail.trim(),
        billing_address: billingAddress.trim(),
        billing_city: billingCity.trim(),
        billing_state: billingState.toUpperCase(),
        billing_zip: billingZip.trim(),
        admin_contact_email: adminContactEmail.trim(),
        admin_contact_phone: formatUSPhone(adminContactPhone),
      });

      addToast('success', 'Billing information updated successfully!');
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
      setIsSubmitting(false);
    } catch (error: any) {
      console.error('Error updating billing information:', error);
      addToast('error', error.message || 'Failed to update billing information');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      // Clear errors after animation completes
      setTimeout(() => {
        setErrors({});
      }, 250);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={`Edit Billing Information - ${organizationName}`}
      size="large"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Billing Contact Section */}
        <div>
          <h3 className="text-base font-semibold text-orange-dark mb-4">Billing Contact Information</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-billing-email" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                Billing Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="edit-billing-email"
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
              <label htmlFor="edit-billing-phone" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                Billing Phone <span className="text-red-500">*</span>
              </label>
              <Input
                id="edit-billing-phone"
                type="tel"
                value={billingPhone}
                onChange={(e) => setBillingPhone(normalizePhoneInput(e.target.value))}
                onBlur={(e) => {
                  const formatted = formatUSPhone(e.target.value);
                  if (formatted !== e.target.value) {
                    setBillingPhone(formatted);
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
              <label htmlFor="edit-billing-address" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                Billing Address <span className="text-red-500">*</span>
              </label>
              <Input
                id="edit-billing-address"
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
                <label htmlFor="edit-billing-city" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <Input
                  id="edit-billing-city"
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
                <label htmlFor="edit-billing-state" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  id="edit-billing-state"
                  value={billingState}
                  onChange={(e) => setBillingState(e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent disabled:bg-gray-light disabled:cursor-not-allowed ${
                    errors.billing_state ? 'border-red-500' : 'border-gray-light'
                  }`}
                >
                  <option value="">Select State</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
                {errors.billing_state && (
                  <p className="mt-1 text-sm text-red-600">{errors.billing_state}</p>
                )}
              </div>
            </div>

            <div className="w-1/2 pr-2">
              <label htmlFor="edit-billing-zip" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                ZIP Code <span className="text-red-500">*</span>
              </label>
              <Input
                id="edit-billing-zip"
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
        <div className="pt-4 border-t border-gray-light">
          <h3 className="text-base font-semibold text-orange-dark mb-4">Administrative Contact</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-admin-email" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                Admin Contact Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="edit-admin-email"
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
              <label htmlFor="edit-admin-phone" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
                Admin Contact Phone <span className="text-red-500">*</span>
              </label>
              <Input
                id="edit-admin-phone"
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
                disabled={isSubmitting}
                className={errors.admin_contact_phone ? 'border-red-500' : ''}
              />
              {errors.admin_contact_phone && (
                <p className="mt-1 text-sm text-red-600">{errors.admin_contact_phone}</p>
              )}
              <p className="mt-1 text-xs text-gray-slate">
                Format: (XXX) XXX-XXXX or XXX-XXX-XXXX
              </p>
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
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
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

