'use client';

import { useState, FormEvent } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { domainsApi } from '@/lib/api-client';
import type { DomainContact, DomainRegistrationType } from '@/types/domains';

interface DomainCheckoutFormProps {
  domain: string;
  registrationType: DomainRegistrationType;
  price: number;
  currency: string;
  onCancel: () => void;
  onSuccess: () => void;
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

export default function DomainCheckoutForm({
  domain,
  registrationType,
  price,
  currency,
  onCancel,
  onSuccess,
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

  return (
    <Card
      title={`${registrationType === 'transfer' ? 'Transfer' : 'Register'}: ${domain}`}
      className="max-w-2xl mx-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Summary */}
        <div className="p-4 rounded-lg bg-orange-light dark:bg-gray-800 border border-gray-light dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-orange-dark dark:text-white">{domain}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {registrationType === 'transfer' ? 'Domain Transfer' : 'New Registration'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-orange">
                ${totalPrice.toFixed(2)} {currency.toUpperCase()}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="text-xs border border-gray-light dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-orange-dark dark:text-white"
                >
                  {[1, 2, 3, 5, 10].map((y) => (
                    <option key={y} value={y}>
                      {y} year{y > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Code for Transfers */}
        {registrationType === 'transfer' && (
          <Input
            label="Authorization / EPP Code"
            placeholder="Enter the auth code from your current registrar"
            value={authCode}
            onChange={(e) => setAuthCode(e.target.value)}
            required
          />
        )}

        {/* Contact Information */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Registrant Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              label="Organization (optional)"
              value={contact.org_name || ''}
              onChange={(e) => updateContact('org_name', e.target.value)}
              className="md:col-span-2"
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
            <Input
              label="Address"
              value={contact.address1}
              onChange={(e) => updateContact('address1', e.target.value)}
              required
              className="md:col-span-2"
            />
            <Input
              label="Address Line 2 (optional)"
              value={contact.address2 || ''}
              onChange={(e) => updateContact('address2', e.target.value)}
              className="md:col-span-2"
            />
            <Input
              label="City"
              value={contact.city}
              onChange={(e) => updateContact('city', e.target.value)}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                State
              </label>
              <select
                value={contact.state}
                onChange={(e) => updateContact('state', e.target.value)}
                required
                className="w-full rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-700 text-orange-dark dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange"
              >
                <option value="">Select state</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <Input
              label="ZIP / Postal Code"
              value={contact.postal_code}
              onChange={(e) => updateContact('postal_code', e.target.value)}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Country
              </label>
              <select
                value={contact.country}
                onChange={(e) => updateContact('country', e.target.value)}
                required
                className="w-full rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-700 text-orange-dark dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Processing...
              </span>
            ) : (
              `Pay $${totalPrice.toFixed(2)} & ${registrationType === 'transfer' ? 'Transfer' : 'Register'}`
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
