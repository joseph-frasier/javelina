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

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

const selectClasses =
  'w-full px-4 py-2.5 rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 text-orange-dark dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange hover:border-orange/50 transition-colors';

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
      {/* Order Summary Strip */}
          <div className="flex items-center justify-between gap-4 rounded-lg bg-orange/5 dark:bg-orange/10 px-4 py-3 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="shrink-0 text-xs font-medium uppercase tracking-[0.22em] text-orange">
                {type}
              </span>
              <span className="truncate font-bold text-orange-dark dark:text-white text-sm">
                {domain}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <select
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="px-2 py-1 rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 text-orange-dark dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange hover:border-orange/50 transition-colors"
              >
                {[1, 2, 3, 5, 10].map((y) => (
                  <option key={y} value={y}>
                    {y}yr
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ${price.toFixed(2)}/yr
              </span>
              <span className="font-black text-orange text-lg">
                ${totalPrice.toFixed(2)}
              </span>
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
                required
              />
            </div>
          )}

          {/* Contact */}
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-orange mb-3">Contact</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <Input
              label="First Name"
              value={contact.first_name}
              onChange={(e) => updateContact('first_name', e.target.value)}
              required
            />
            <Input
              label="Last Name"
              value={contact.last_name}
              onChange={(e) => updateContact('last_name', e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              value={contact.email}
              onChange={(e) => updateContact('email', e.target.value)}
              required
            />
            <Input
              label="Phone"
              placeholder="(555) 123-4567"
              value={contact.phone}
              onChange={(e) => updateContact('phone', e.target.value)}
              required
            />
          </div>

          {/* Address */}
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-orange mb-3">Address</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <div className="md:col-span-2">
              <Input
                label="Address"
                value={contact.address1}
                onChange={(e) => updateContact('address1', e.target.value)}
                helperText="Include suite, unit, etc. if needed"
                required
              />
            </div>
            <Input
              label="City"
              value={contact.city}
              onChange={(e) => updateContact('city', e.target.value)}
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
              required
            />
            <Dropdown
              label="Country"
              value={contact.country}
              onChange={(val) => updateContact('country', val)}
              options={[
                { value: 'US', label: 'United States' },
                { value: 'CA', label: 'Canada' },
                { value: 'GB', label: 'United Kingdom' },
                { value: 'AU', label: 'Australia' },
              ]}
            />
          </div>

          {/* Organization - half width */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <Input
              label="Organization"
              helperText="Optional"
              value={contact.org_name || ''}
              onChange={(e) => updateContact('org_name', e.target.value)}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-4 animate-fadeIn">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Buttons - inside card, side by side */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" size="lg" className="flex-1" loading={isSubmitting}>
              {isSubmitting
                ? 'Processing...'
                : `Pay $${totalPrice.toFixed(2)} & ${type}`}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
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
