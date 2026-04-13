'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import { domainsApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { US_STATES, COUNTRY_OPTIONS } from '@/lib/domain-constants';
import type { DomainContact } from '@/types/domains';

interface EditWhoisModalProps {
  isOpen: boolean;
  onClose: () => void;
  domainId: string;
  initialContact: DomainContact;
  onSuccess: (updated: DomainContact) => void;
}

function extractErrorMessage(err: any, fallback: string): string {
  const raw = err?.details || err?.message;
  if (!raw) return fallback;
  const msg = typeof raw === 'string' ? raw : raw?.error || raw?.message || JSON.stringify(raw);
  if (typeof msg === 'string' && msg.includes('Object status prohibits operation')) {
    return 'The domain is currently locked. Disable the Domain Lock and wait a few minutes for the change to propagate, then try again.';
  }
  return msg;
}

export function EditWhoisModal({
  isOpen,
  onClose,
  domainId,
  initialContact,
  onSuccess,
}: EditWhoisModalProps) {
  const { addToast } = useToastStore();
  const [formData, setFormData] = useState<DomainContact>(initialContact);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialContact);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const update = (field: keyof DomainContact, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await domainsApi.updateContacts(domainId, formData);
      addToast('success', 'Contact information updated successfully.');
      onSuccess(formData);
      onClose();
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to update contacts'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit WHOIS Contact Information"
      size="large"
      allowOverflow
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form="whois-form" variant="primary" size="md" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save contact info'}
          </Button>
        </div>
      }
    >
      <form id="whois-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="First Name" value={formData.first_name} onChange={(e) => update('first_name', e.target.value)} required />
          <Input label="Last Name" value={formData.last_name} onChange={(e) => update('last_name', e.target.value)} required />
          <Input label="Organization (optional)" value={formData.org_name || ''} onChange={(e) => update('org_name', e.target.value)} className="md:col-span-2" />
          <Input label="Email" type="email" value={formData.email} onChange={(e) => update('email', e.target.value)} required />
          <Input label="Phone" placeholder="(555) 123-4567" value={formData.phone} onChange={(e) => update('phone', e.target.value)} required />
          <Input label="Address" value={formData.address1} onChange={(e) => update('address1', e.target.value)} required className="md:col-span-2" />
          <Input label="Address Line 2 (optional)" value={formData.address2 || ''} onChange={(e) => update('address2', e.target.value)} className="md:col-span-2" />
          <Input label="City" value={formData.city} onChange={(e) => update('city', e.target.value)} required />
          <Dropdown
            label="State"
            value={formData.state}
            onChange={(val) => update('state', val)}
            options={[
              { value: '', label: 'Select state' },
              ...US_STATES.map((s) => ({ value: s, label: s })),
            ]}
          />
          <Input label="ZIP / Postal Code" value={formData.postal_code} onChange={(e) => update('postal_code', e.target.value)} required />
          <Dropdown
            label="Country"
            value={formData.country}
            onChange={(val) => update('country', val)}
            options={COUNTRY_OPTIONS}
          />
        </div>
      </form>
    </Modal>
  );
}
