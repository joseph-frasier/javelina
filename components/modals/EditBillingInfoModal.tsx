'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
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
  const [copyBillingPhone, setCopyBillingPhone] = useState(false);
  
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
      title="Edit Billing Information"
      eyebrow={`${organizationName} billing record`}
      subtitle="Update the billing contact details and administrative owner information together."
      size="large"
      bodyClassName="space-y-6"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[22px] border border-orange/20 bg-orange/10 p-5 dark:border-orange/25 dark:bg-orange/10">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange/20 bg-white/70 text-orange dark:bg-orange/15">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-orange">Billing record</p>
                <h3 className="mt-2 text-lg font-semibold text-orange-dark dark:text-[#fff3ea]">
                  Keep invoices and owner contacts current
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-slate dark:text-white/70">
                  Changes here update the organization billing profile used for receipts, billing follow-up, and administrative account communication.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-blue-200 bg-blue-50 p-5 dark:border-blue-electric/20 dark:bg-blue-electric/10">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-blue-electric">What to update</p>
            <ol className="mt-3 space-y-3 text-sm text-gray-slate dark:text-white/70">
              <li>1. Confirm the billing email, phone, and mailing address.</li>
              <li>2. Review the administrative contact or reuse the billing contact where it makes sense.</li>
              <li>3. Save changes to update the organization billing record.</li>
            </ol>
          </div>
        </div>

        <section className="rounded-[22px] border border-gray-light bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-orange">Section 1</p>
            <h3 className="mt-2 text-lg font-semibold text-orange-dark dark:text-[#fff3ea]">Billing contact</h3>
            <p className="mt-1 text-sm text-gray-slate dark:text-white/60">
              These details are used for invoices, billing notices, and mailed correspondence.
            </p>
          </div>

          <div className="space-y-4">
            <Input
              id="edit-billing-email"
              label="Billing Email *"
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
              helperText="Use the email that should receive invoices and billing alerts."
              error={errors.billing_email}
              className={errors.billing_email ? 'border-red-500' : ''}
            />

            <Input
              id="edit-billing-phone"
              label="Billing Phone *"
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
              helperText="Accepted formats: (XXX) XXX-XXXX or XXX-XXX-XXXX"
              error={errors.billing_phone}
              className={errors.billing_phone ? 'border-red-500' : ''}
            />

            <Input
              id="edit-billing-address"
              label="Billing Address *"
              type="text"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="123 Main Street"
              disabled={isSubmitting}
              error={errors.billing_address}
              className={errors.billing_address ? 'border-red-500' : ''}
            />

            <div className="grid gap-4 md:grid-cols-[1.1fr_1fr_0.7fr]">
              <Input
                id="edit-billing-city"
                label="City *"
                type="text"
                value={billingCity}
                onChange={(e) => setBillingCity(e.target.value)}
                placeholder="San Francisco"
                disabled={isSubmitting}
                error={errors.billing_city}
                className={errors.billing_city ? 'border-red-500' : ''}
              />

              <div>
                <label htmlFor="edit-billing-state" className="mb-2 block text-sm font-medium text-orange-dark dark:text-white">
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

              <Input
                id="edit-billing-zip"
                label="ZIP Code *"
                type="text"
                value={billingZip}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                  setBillingZip(value);
                }}
                placeholder="94102"
                maxLength={5}
                disabled={isSubmitting}
                helperText="5-digit ZIP"
                error={errors.billing_zip}
                className={errors.billing_zip ? 'border-red-500' : ''}
              />
            </div>
          </div>
        </section>

        <section className="rounded-[22px] border border-gray-light bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-orange">Section 2</p>
            <h3 className="mt-2 text-lg font-semibold text-orange-dark dark:text-[#fff3ea]">Administrative contact</h3>
            <p className="mt-1 text-sm text-gray-slate dark:text-white/60">
              Set the person who should receive account-level and operational follow-up.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-light bg-gray-50 p-4 dark:border-white/10 dark:bg-black/20">
              <label className="mb-3 flex items-center text-sm font-medium text-gray-slate dark:text-white/65">
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
                Use billing email for the admin contact
              </label>
              <Input
                id="edit-admin-email"
                label="Admin Contact Email *"
                type="email"
                value={adminContactEmail}
                onChange={(e) => setAdminContactEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled={isSubmitting || copyBillingEmail}
                helperText={copyBillingEmail ? 'This field stays synced to the billing email while this option is enabled.' : 'Use the email that should receive admin notices.'}
                error={errors.admin_contact_email}
                className={errors.admin_contact_email ? 'border-red-500' : ''}
              />
            </div>

            <div className="rounded-2xl border border-gray-light bg-gray-50 p-4 dark:border-white/10 dark:bg-black/20">
              <label className="mb-3 flex items-center text-sm font-medium text-gray-slate dark:text-white/65">
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
                Use billing phone for the admin contact
              </label>
              <Input
                id="edit-admin-phone"
                label="Admin Contact Phone *"
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
                helperText={copyBillingPhone ? 'This field stays synced to the billing phone while this option is enabled.' : 'Accepted formats: (XXX) XXX-XXXX or XXX-XXX-XXXX'}
                error={errors.admin_contact_phone}
                className={errors.admin_contact_phone ? 'border-red-500' : ''}
              />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pt-2">
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
