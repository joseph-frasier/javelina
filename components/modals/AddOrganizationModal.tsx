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
            pending_plan_code: selectedPlan.code,
            pending_price_id: selectedPlan.monthly?.priceId,
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

  const planPriceLabel = selectedPlan?.monthly
    ? selectedPlan.monthly.amount > 0
      ? `$${selectedPlan.monthly.amount.toFixed(2)}/month`
      : 'Free forever'
    : 'Plan selected later';

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Create Organization"
      eyebrow={selectedPlan ? `${selectedPlan.name} plan setup` : 'Organization setup'}
      subtitle="Set up the organization profile, billing contact, and administrative contact in one pass."
      size="large"
      allowOverflow
      bodyClassName="space-y-6"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[22px] border border-accent/20 bg-accent-soft p-5 dark:border-accent/25 dark:bg-accent-soft">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/20 bg-surface/70 text-accent dark:bg-accent/15">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent">Plan Summary</p>
                <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                  <h3 className="text-xl font-semibold text-text dark:text-[#fff3ea]">
                    {selectedPlan ? selectedPlan.name : 'Organization setup'}
                  </h3>
                  <span className="text-sm font-medium text-text/70">
                    {planPriceLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-text/70">
                  {selectedPlan
                    ? selectedPlan.description
                    : 'Create the organization now and attach or change the plan afterward if needed.'}
                </p>
                <p className="mt-3 text-sm text-text/55">
                  {selectedPlan
                    ? 'Submitting this form creates the organization and carries the selected plan details into the billing flow.'
                    : 'This form creates the organization and stores the required billing and admin contacts.'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-blue-200 bg-blue-50 p-5 dark:border-blue-electric/20 dark:bg-blue-electric/10">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-blue-electric">Setup Flow</p>
            <ol className="mt-3 space-y-3 text-sm text-text/70">
              <li>1. Name the organization and add team-facing context.</li>
              <li>2. Add billing contact and address details.</li>
              <li>3. Confirm the administrative owner and submit.</li>
            </ol>
          </div>
        </div>

        {errors.general && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/25 dark:bg-red-500/10">
            <p className="text-sm text-red-800">{errors.general}</p>
          </div>
        )}

        <section className="rounded-[22px] border border-border bg-surface p-5 shadow-sm dark:border-white/10 dark:bg-surface/[0.04] dark:shadow-none">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent">Section 1</p>
            <h3 className="mt-2 text-lg font-semibold text-text dark:text-[#fff3ea]">Organization profile</h3>
            <p className="mt-1 text-sm text-text/60">
              Start with the name and description your teammates will recognize first.
            </p>
          </div>

          <div className="space-y-5">
            <Input
              id="org-name"
              label="Organization Name *"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Company Corp"
              disabled={isSubmitting}
              error={errors.name}
              helperText={`${name.length}/100 characters`}
              className={errors.name ? 'border-red-500' : ''}
              maxLength={100}
            />

            <div>
              <label htmlFor="org-description" className="mb-2 block text-sm font-medium text-text">
                Description
              </label>
              <textarea
                id="org-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description or notes"
                disabled={isSubmitting}
                rows={4}
                maxLength={500}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:bg-surface-alt dark:border-white/10 dark:bg-[#0f151d] dark:text-white dark:placeholder:text-white/25"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-text/45">
                <span>Give teammates a short explanation of what this workspace is for.</span>
                <span>{description.length}/500 characters</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[22px] border border-border bg-surface p-5 shadow-sm dark:border-white/10 dark:bg-surface/[0.04] dark:shadow-none">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent">Section 2</p>
            <h3 className="mt-2 text-lg font-semibold text-text dark:text-[#fff3ea]">Billing contact</h3>
            <p className="mt-1 text-sm text-text/60">
              These details are used for invoices, receipts, and billing follow-up.
            </p>
          </div>

          <div className="space-y-4">
            <Input
              id="billing-email"
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
              helperText="Use the address that should receive billing notices."
              error={errors.billing_email}
              className={errors.billing_email ? 'border-red-500' : ''}
            />

            <Input
              id="billing-phone"
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
              id="billing-address"
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
                id="billing-city"
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
                <label htmlFor="billing-state" className="mb-2 block text-sm font-medium text-text">
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
                id="billing-zip"
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

        <section className="rounded-[22px] border border-border bg-surface p-5 shadow-sm dark:border-white/10 dark:bg-surface/[0.04] dark:shadow-none">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent">Section 3</p>
            <h3 className="mt-2 text-lg font-semibold text-text dark:text-[#fff3ea]">Administrative contact</h3>
            <p className="mt-1 text-sm text-text/60">
              Choose who should receive operational and account-level follow-up.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-gray-50 p-4 dark:border-white/10 dark:bg-black/20">
              <label className="mb-3 flex items-center text-sm font-medium text-text/65">
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
                id="admin-email"
                label="Admin Contact Email *"
                type="email"
                value={adminContactEmail}
                onChange={(e) => setAdminContactEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled={isSubmitting || copyBillingEmail}
                helperText={copyBillingEmail ? 'This field is synced from billing email.' : 'Use the address that should receive admin notices.'}
                error={errors.admin_contact_email}
                className={errors.admin_contact_email ? 'border-red-500' : ''}
              />
            </div>

            <div className="rounded-2xl border border-border bg-gray-50 p-4 dark:border-white/10 dark:bg-black/20">
              <label className="mb-3 flex items-center text-sm font-medium text-text/65">
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
                id="admin-phone"
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
                helperText={copyBillingPhone ? 'This field is synced from billing phone.' : 'Accepted formats: (XXX) XXX-XXXX or XXX-XXX-XXXX'}
                error={errors.admin_contact_phone}
                className={errors.admin_contact_phone ? 'border-red-500' : ''}
              />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end space-x-3 pt-2">
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
