'use client';

import { useState, FormEvent } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Dropdown from '@/components/ui/Dropdown';
import { domainsApi } from '@/lib/api-client';
import type { DomainContact, DomainRegistrationType } from '@/types/domains';

interface DomainCheckoutFormProps {
  domain: string;
  registrationType: DomainRegistrationType;
  price: number;
  currency: string;
  onCancel: () => void;
  onSuccess: () => void;
  asModal?: boolean;
}

import { US_STATES, COUNTRY_OPTIONS } from '@/lib/domain-constants';

const selectClasses =
  'w-full px-4 py-2.5 rounded-md border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-accent hover:border-accent/50 transition-colors';

export default function DomainCheckoutForm({
  domain,
  registrationType,
  price,
  currency,
  onCancel,
  onSuccess,
  asModal = false,
}: DomainCheckoutFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState('');
  const [years, setYears] = useState(1);
  const [contact, setContact] = useState<DomainContact>({
    first_name: '',
    last_name: '',
    org_name: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
  });

  const updateContact = (field: keyof DomainContact, value: string) => {
    setContact((prev) => ({ ...prev, [field]: value }));
  };

  const formatPhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `+1.${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+1.${digits.slice(1)}`;
    return phone;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formattedContact = {
        ...contact,
        phone: formatPhone(contact.phone),
      };

      const result = await domainsApi.checkout({
        domain,
        years,
        contact_info: formattedContact,
        registration_type: registrationType,
        auth_code: registrationType === 'transfer' ? authCode : undefined,
      });

      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        onSuccess();
      }
    } catch (err: any) {
      const message = err?.details || err?.message || 'Failed to create checkout session';
      setError(typeof message === 'string' ? message : JSON.stringify(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPrice = price * years;
  const type = registrationType === 'transfer' ? 'Transfer' : 'Register';

  const formContent = (
    <>
      {/* Order Summary Row */}
          <div className="flex items-center justify-between gap-4 pb-4 mb-5 border-b border-border">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">
                {type}
              </span>
              <span className="text-text-faint text-xs">·</span>
              <span className="truncate font-semibold text-text text-sm">
                {domain}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="px-2 py-1 rounded-md border border-border bg-surface-alt text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
              >
                {[1, 2, 3, 5, 10].map((y) => (
                  <option key={y} value={y}>
                    {y}yr
                  </option>
                ))}
              </select>
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-text-faint line-through">
                  ${price.toFixed(2)}/yr
                </span>
                <span className="font-black text-accent text-base">
                  ${totalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Auth Code - transfer only */}
          {registrationType === 'transfer' && (
            <div className="mb-5">
              <Input
                label="Authorization / EPP Code"
                placeholder="Enter the auth code from your current registrar"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                maxLength={128}
                required
              />
            </div>
          )}

          {/* Contact */}
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent mb-3">Contact</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <Input
              label="First Name"
              value={contact.first_name}
              onChange={(e) => updateContact('first_name', e.target.value)}
              maxLength={64}
              required
            />
            <Input
              label="Last Name"
              value={contact.last_name}
              onChange={(e) => updateContact('last_name', e.target.value)}
              maxLength={64}
              required
            />
            <Input
              label="Email"
              type="email"
              value={contact.email}
              onChange={(e) => updateContact('email', e.target.value)}
              maxLength={254}
              required
            />
            <Input
              label="Phone"
              placeholder="(555) 123-4567"
              value={contact.phone}
              onChange={(e) => updateContact('phone', e.target.value)}
              maxLength={20}
              required
            />
          </div>

          {/* Address */}
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent mb-3">Address</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <div className="md:col-span-2">
              <Input
                label="Address"
                value={contact.address1}
                onChange={(e) => updateContact('address1', e.target.value)}
                helperText="Include suite, unit, etc. if needed"
                maxLength={128}
                required
              />
            </div>
            <Input
              label="City"
              value={contact.city}
              onChange={(e) => updateContact('city', e.target.value)}
              maxLength={64}
              required
            />
            <Dropdown
              label="State"
              value={contact.state}
              onChange={(val) => updateContact('state', val)}
              options={[
                { value: '', label: 'Select state' },
                ...US_STATES.map((s) => ({ value: s, label: s })),
              ]}
            />
            <Input
              label="ZIP / Postal Code"
              value={contact.postal_code}
              onChange={(e) => updateContact('postal_code', e.target.value)}
              maxLength={16}
              required
            />
            <Dropdown
              label="Country"
              value={contact.country}
              onChange={(val) => updateContact('country', val)}
              options={COUNTRY_OPTIONS}
            />
          </div>

          {/* Organization - half width */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <Input
              label="Organization"
              helperText="Optional"
              value={contact.org_name || ''}
              onChange={(e) => updateContact('org_name', e.target.value)}
              maxLength={128}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-4 animate-fadeIn">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Buttons - inside card, side by side */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="lg" loading={isSubmitting}>
              {isSubmitting
                ? 'Processing...'
                : `Pay $${totalPrice.toFixed(2)} & ${type}`}
            </Button>
          </div>
    </>
  );

  if (asModal) {
    return <form onSubmit={handleSubmit}>{formContent}</form>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <Card>{formContent}</Card>
      </form>
    </div>
  );
}
