'use client';

import React from 'react';
import { clsx } from 'clsx';
import { useWizardStore } from '@/lib/wizard-store';
import WizardShell, { StepHeader } from './WizardShell';
import RadioCard from '@/components/ui/RadioCard';

const SparkleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2" />
  </svg>
);

const ServerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="2.5" y="3" width="11" height="4" rx="1" />
    <rect x="2.5" y="9" width="11" height="4" rx="1" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="8" cy="8" r="5.5" />
    <line x1="2.5" y1="8" x2="13.5" y2="8" />
    <path d="M8 2.5c1.7 2 1.7 9 0 11M8 2.5c-1.7 2-1.7 9 0 11" />
  </svg>
);

const PROVIDERS = ['Cloudflare', 'Route 53', 'Google', 'Other'];

export default function StepDNS() {
  const dnsMode = useWizardStore((s) => s.dnsMode);
  const dnsProvider = useWizardStore((s) => s.dnsProvider);
  const setField = useWizardStore((s) => s.setField);

  const canContinue =
    dnsMode === 'javelina' ||
    dnsMode === 'skip' ||
    (dnsMode === 'self' && !!dnsProvider);

  return (
    <WizardShell canContinue={canContinue}>
      <StepHeader
        eyebrow="Step 1 of 5"
        title="How do you want to manage DNS?"
        subtitle="Choose who's in charge of your DNS records. You can always switch later — nothing here is permanent."
      />

      <div className="grid gap-3">
        <RadioCard
          checked={dnsMode === 'javelina'}
          onChange={() => setField('dnsMode', 'javelina')}
          icon={<SparkleIcon />}
          label="Let Javelina manage it (recommended)"
          description="We'll point your domain at our nameservers and wire up A, AAAA, CNAME, and MX records automatically. Best if you want it to just work."
        />
        <RadioCard
          checked={dnsMode === 'self'}
          onChange={() => setField('dnsMode', 'self')}
          icon={<ServerIcon />}
          label="I&apos;ll manage my own DNS"
          description="Keep your current DNS provider (Cloudflare, Route 53, etc). We'll give you the records to add."
        />
        <RadioCard
          checked={dnsMode === 'skip'}
          onChange={() => setField('dnsMode', 'skip')}
          icon={<GlobeIcon />}
          label="Skip for now"
          description="Your site will live at a javelina.app subdomain. You can add a custom domain whenever you're ready."
        />
      </div>

{dnsMode === 'self' && (
        <div className="mt-6">
          <label className="block text-sm font-semibold text-text mb-2">
            Current DNS provider
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setField('dnsProvider', p)}
                className={clsx(
                  'px-3 py-2.5 rounded-md text-sm font-medium transition-colors border',
                  dnsProvider === p
                    ? 'bg-accent-soft border-accent text-accent'
                    : 'bg-surface border-border text-text hover:border-border-strong'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </WizardShell>
  );
}
