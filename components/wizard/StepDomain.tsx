'use client';

import React, { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { useWizardStore } from '@/lib/wizard-store';
import WizardShell, { StepHeader } from './WizardShell';
import Input from '@/components/ui/Input';
import DomainSearchResult from '@/components/ui/DomainSearchResult';
import InfoCallout from '@/components/ui/InfoCallout';

// Mocked client-side TLD availability until we wire to domainsApi.search().
// Keeping the shape identical to the backend response makes the later swap a
// one-line change: replace computeResults with a data fetch.
const MOCK_TLDS: Array<{ tld: string; price: string; available: boolean }> = [
  { tld: '.com', price: '$12.99/yr', available: true },
  { tld: '.co', price: '$28.99/yr', available: true },
  { tld: '.app', price: '$16.99/yr', available: true },
  { tld: '.io', price: '$48.99/yr', available: false },
  { tld: '.dev', price: '$14.99/yr', available: true },
  { tld: '.net', price: '$14.99/yr', available: true },
];

function normalizeQuery(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/^https?:\/\//, '')
    .replace(/\..*/, '');
}

export default function StepDomain() {
  const domainQuery = useWizardStore((s) => s.domainQuery);
  const selectedDomain = useWizardStore((s) => s.selectedDomain);
  const setField = useWizardStore((s) => s.setField);

  const [hasSearched, setHasSearched] = useState(() => !!domainQuery);

  const results = useMemo(() => {
    const base = normalizeQuery(domainQuery);
    if (!base) return [];
    return MOCK_TLDS.map((t) => ({
      domain: `${base}${t.tld}`,
      price: t.price,
      available: t.available,
    }));
  }, [domainQuery]);

  const canContinue = !!selectedDomain;

  return (
    <WizardShell canContinue={canContinue}>
      <StepHeader
        eyebrow="Step 3 of 5"
        title="Find your domain"
        subtitle="Search for a domain to purchase through Javelina, or connect one you already own in the final step."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setHasSearched(true);
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <div className="flex-1">
          <Input
            value={domainQuery}
            onChange={(e) => setField('domainQuery', e.target.value)}
            placeholder="mesaroasters"
            suffixHint=".com"
            aria-label="Search domain name"
          />
        </div>
        <button
          type="submit"
          disabled={!normalizeQuery(domainQuery)}
          className={clsx(
            'h-10 px-4 rounded-md bg-accent text-white text-sm font-medium transition-colors',
            'hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:shadow-focus-ring'
          )}
        >
          Search
        </button>
      </form>

      {hasSearched && results.length > 0 && (
        <div className="mt-6 space-y-2">
          {results.map((r) => (
            <DomainSearchResult
              key={r.domain}
              domain={r.domain}
              available={r.available}
              price={r.price}
              selected={selectedDomain === r.domain}
              onSelect={() => setField('selectedDomain', r.domain)}
            />
          ))}
        </div>
      )}

      {hasSearched && results.length === 0 && (
        <div className="mt-6">
          <InfoCallout tone="info">
            Enter a name above and hit search to see available TLDs.
          </InfoCallout>
        </div>
      )}
    </WizardShell>
  );
}
