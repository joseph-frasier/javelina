'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/lib/wizard-store';
import WizardShell, { StepHeader } from './WizardShell';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <dt className="text-sm text-text-muted shrink-0">{label}</dt>
      <dd className="text-sm text-text text-right max-w-[60%]">{value}</dd>
    </div>
  );
}

const DNS_LABELS: Record<string, string> = {
  javelina: 'Javelina-managed nameservers',
  self: 'Self-managed DNS',
  skip: 'Skipped — using javelina.app subdomain',
};

const AESTHETIC_LABELS: Record<string, string> = {
  bold: 'Bold & editorial',
  simple: 'Simple & professional',
  playful: 'Playful & warm',
};

export default function StepConfirm() {
  const router = useRouter();
  const state = useWizardStore();

  const handleLaunch = () => {
    state.markCompleted(4);
    router.push('/');
  };

  return (
    <WizardShell
      canContinue={true}
      continueLabel="Launch"
      onContinue={handleLaunch}
      finalStep
    >
      <StepHeader
        eyebrow="Step 5 of 5"
        title="Ready to launch?"
        subtitle="Review the details below. You can still change anything after launch — this just gets your site spun up."
      />

      <div className="space-y-6">
        <section>
          <h3 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-text-faint mb-2">
            DNS
          </h3>
          <dl className="rounded-lg border border-border bg-surface-alt px-4">
            <Row
              label="Mode"
              value={state.dnsMode ? DNS_LABELS[state.dnsMode] : '—'}
            />
            {state.dnsMode === 'self' && (
              <Row label="Provider" value={state.dnsProvider ?? '—'} />
            )}
          </dl>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-text-faint mb-2">
            Website
          </h3>
          <dl className="rounded-lg border border-border bg-surface-alt px-4">
            <Row label="Business name" value={state.businessName || '—'} />
            {state.tagline && <Row label="Tagline" value={state.tagline} />}
            {state.description && (
              <Row label="Description" value={state.description} />
            )}
            {state.tones.length > 0 && (
              <Row label="Voice" value={state.tones.join(', ')} />
            )}
            <Row
              label="Aesthetic"
              value={state.aesthetic ? AESTHETIC_LABELS[state.aesthetic] : '—'}
            />
          </dl>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-text-faint mb-2">
            Domain
          </h3>
          <dl className="rounded-lg border border-border bg-surface-alt px-4">
            <Row
              label="Selected"
              value={
                state.selectedDomain ? (
                  <span className="font-mono">{state.selectedDomain}</span>
                ) : (
                  '—'
                )
              }
            />
            <Row
              label="WHOIS privacy"
              value={state.whoisPrivacy ? 'On' : 'Off'}
            />
          </dl>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-text-faint mb-2">
            Contact
          </h3>
          <dl className="rounded-lg border border-border bg-surface-alt px-4">
            <Row
              label="Name"
              value={
                state.firstName || state.lastName
                  ? `${state.firstName} ${state.lastName}`.trim()
                  : '—'
              }
            />
            <Row label="Email" value={state.email || '—'} />
            {state.phone && <Row label="Phone" value={state.phone} />}
            <Row
              label="Address"
              value={
                state.addressLine1 ? (
                  <>
                    {state.addressLine1}
                    {state.addressLine2 && (
                      <>
                        <br />
                        {state.addressLine2}
                      </>
                    )}
                    <br />
                    {[state.city, state.region, state.postalCode]
                      .filter(Boolean)
                      .join(', ')}
                    <br />
                    {state.country}
                  </>
                ) : (
                  '—'
                )
              }
            />
          </dl>
        </section>
      </div>
    </WizardShell>
  );
}
