'use client';

import React from 'react';
import { useWizardStore } from '@/lib/wizard-store';
import WizardShell, { StepHeader } from './WizardShell';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import InfoCallout from '@/components/ui/InfoCallout';

export default function StepContact() {
  const {
    firstName,
    lastName,
    email,
    phone,
    addressLine1,
    addressLine2,
    city,
    region,
    postalCode,
    country,
    whoisPrivacy,
    setField,
  } = useWizardStore((s) => ({
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email,
    phone: s.phone,
    addressLine1: s.addressLine1,
    addressLine2: s.addressLine2,
    city: s.city,
    region: s.region,
    postalCode: s.postalCode,
    country: s.country,
    whoisPrivacy: s.whoisPrivacy,
    setField: s.setField,
  }));

  const canContinue =
    !!firstName.trim() &&
    !!lastName.trim() &&
    !!email.trim() &&
    !!addressLine1.trim() &&
    !!city.trim() &&
    !!region.trim() &&
    !!postalCode.trim() &&
    !!country.trim();

  return (
    <WizardShell canContinue={canContinue}>
      <StepHeader
        eyebrow="Step 4 of 5"
        title="Registrant contact"
        subtitle="ICANN requires accurate contact details on every domain. WHOIS privacy shields them from public lookups."
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label="First name"
          value={firstName}
          onChange={(e) => setField('firstName', e.target.value)}
        />
        <Input
          label="Last name"
          value={lastName}
          onChange={(e) => setField('lastName', e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setField('email', e.target.value)}
          className="sm:col-span-1"
        />
        <Input
          label="Phone"
          type="tel"
          value={phone}
          onChange={(e) => setField('phone', e.target.value)}
          helperText="Include country code."
        />
        <Input
          label="Address line 1"
          value={addressLine1}
          onChange={(e) => setField('addressLine1', e.target.value)}
          className="sm:col-span-2"
        />
        <Input
          label="Address line 2"
          value={addressLine2}
          onChange={(e) => setField('addressLine2', e.target.value)}
          helperText="Optional"
          className="sm:col-span-2"
        />
        <Input
          label="City"
          value={city}
          onChange={(e) => setField('city', e.target.value)}
        />
        <Input
          label="State / region"
          value={region}
          onChange={(e) => setField('region', e.target.value)}
        />
        <Input
          label="Postal code"
          value={postalCode}
          onChange={(e) => setField('postalCode', e.target.value)}
        />
        <Input
          label="Country"
          value={country}
          onChange={(e) => setField('country', e.target.value)}
        />
      </div>

      <div className="mt-6 p-4 rounded-lg border border-border bg-surface-alt">
        <Switch
          checked={whoisPrivacy}
          onChange={(v) => setField('whoisPrivacy', v)}
          label="WHOIS privacy"
          description="Replace your contact details in the public WHOIS record with Javelina's proxy. Included at no extra charge."
        />
      </div>

      {!whoisPrivacy && (
        <div className="mt-4">
          <InfoCallout tone="warning">
            Without WHOIS privacy, your name, email, and address are publicly
            queryable for the life of the registration.
          </InfoCallout>
        </div>
      )}
    </WizardShell>
  );
}
