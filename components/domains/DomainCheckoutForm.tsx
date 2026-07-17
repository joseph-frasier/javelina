'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Dropdown from '@/components/ui/Dropdown';
import { domainsApi } from '@/lib/api-client';
import { useAuthStore } from '@/lib/stores/auth-store';

const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};
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

// POST /api/domains/checkout is gated by requireOrgRole(["SuperAdmin","Admin","Editor"]),
// so offering an org the user only views would 403 after the form is filled in.
const CHECKOUT_ROLES = ['SuperAdmin', 'Admin', 'Editor'];

import { US_STATES, COUNTRY_OPTIONS } from '@/lib/constants/domains';

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
  // Deliberately blank: the org must be chosen, never defaulted, so a domain
  // can't be filed into the wrong org without the user ever seeing the choice.
  const [orgId, setOrgId] = useState('');
  const { user } = useAuthStore();
  const eligibleOrgs = (user?.organizations ?? []).filter((o) =>
    CHECKOUT_ROLES.includes(o.role)
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [shouldRenderYearModal, setShouldRenderYearModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const yearOverlayRef = useRef<HTMLDivElement>(null);
  const yearCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  useEffect(() => { if (isYearModalOpen) setShouldRenderYearModal(true); }, [isYearModalOpen]);

  useGSAP(() => {
    if (!mounted || !shouldRenderYearModal || !isYearModalOpen) return;
    if (!yearOverlayRef.current || !yearCardRef.current) return;
    gsap.fromTo(yearOverlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power2.out' });
    gsap.fromTo(yearCardRef.current, { scale: 0.97, opacity: 0, y: 16 }, { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' });
  }, [isYearModalOpen, mounted, shouldRenderYearModal]);

  useEffect(() => {
    if (!mounted || !shouldRenderYearModal || isYearModalOpen) return;
    if (!yearOverlayRef.current || !yearCardRef.current) return;
    gsap.killTweensOf([yearOverlayRef.current, yearCardRef.current]);
    const tl = gsap.timeline({ onComplete: () => setShouldRenderYearModal(false) });
    tl.to(yearOverlayRef.current, { opacity: 0, duration: 0.18, ease: 'power2.in' });
    tl.to(yearCardRef.current, { scale: 0.97, opacity: 0, y: 16, duration: 0.18, ease: 'power2.in' }, 0);
  }, [isYearModalOpen, mounted, shouldRenderYearModal]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && isYearModalOpen) setIsYearModalOpen(false); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isYearModalOpen]);
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

    if (!orgId) {
      setError('Select the organization this domain will belong to.');
      return;
    }

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
        org_id: orgId,
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
      {/* Organization — blank by default; the user must choose where this domain lands */}
          <div className="mb-5">
            {eligibleOrgs.length === 0 ? (
              <p className="text-sm text-danger">
                You don&apos;t have permission to register domains in any of your
                organizations. Ask an admin for the SuperAdmin, Admin, or Editor role.
              </p>
            ) : (
              <>
                <Dropdown
                  label="Organization *"
                  value={orgId}
                  onChange={setOrgId}
                  options={[
                    { value: '', label: 'Select an organization...' },
                    ...eligibleOrgs.map((o) => ({ value: o.id, label: o.name })),
                  ]}
                />
                <p className="mt-1.5 text-xs text-text-muted">
                  This domain will belong to this organization.
                </p>
              </>
            )}
          </div>

      {/* Year & Price Row */}
          <div className="flex items-center justify-end gap-3 mb-5">
            {/* Desktop: native select */}
            <select
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="hidden md:block px-2 py-1 rounded-md border border-border bg-surface-alt text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
            >
              {[1, 2, 3, 5, 10].map((y) => (
                <option key={y} value={y}>{y}yr</option>
              ))}
            </select>

            {/* Mobile: button that opens a picker modal */}
            <button
              type="button"
              onClick={() => setIsYearModalOpen(true)}
              className="md:hidden flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-surface-alt text-text text-sm"
            >
              {years}yr
              <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-text-muted">${price.toFixed(2)}/yr</span>
              <span className="font-black text-accent text-base">${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Mobile year picker modal — portal with GSAP animations matching Modal.tsx */}
          {shouldRenderYearModal && mounted && createPortal(
            <div className="md:hidden fixed inset-0 z-[99999] flex items-center justify-center px-6">
              <div
                ref={yearOverlayRef}
                className="fixed inset-0 bg-[rgba(11,13,16,0.55)] backdrop-blur-[2px]"
                onClick={() => setIsYearModalOpen(false)}
              />
              <div
                ref={yearCardRef}
                className="relative z-10 bg-surface border border-border rounded-2xl w-full max-w-xs overflow-hidden shadow-popover"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <p className="text-base font-semibold text-text">Registration period</p>
                  <button
                    type="button"
                    onClick={() => setIsYearModalOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-text-muted hover:bg-surface-hover hover:text-text transition-colors"
                    aria-label="Close"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {[1, 2, 3, 5, 10].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => { setYears(y); setIsYearModalOpen(false); }}
                    className={`w-full text-left px-5 py-3.5 text-sm transition-colors flex items-center justify-between ${
                      years === y
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-text hover:bg-surface-hover'
                    }`}
                  >
                    <span>{y} {y === 1 ? 'year' : 'years'}</span>
                    {years === y && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>,
            document.body
          )}

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
              onChange={(e) => updateContact('phone', formatPhoneNumber(e.target.value))}
              maxLength={20}
              required
            />
          </div>

          {/* Address */}
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

          {/* WHOIS contact company - half width. Named "Company", not "Organization",
              to avoid colliding with the org selector above, which is a different thing. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <Input
              label="Company"
              helperText="Appears in public WHOIS records. Optional."
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
