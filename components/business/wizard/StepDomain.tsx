'use client';
import { useEffect, useState } from 'react';
import type { BusinessIntakeData } from '@/lib/business-intake-store';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';
import { StepHeader } from '@/components/business/ui/StepHeader';
import { FieldLabel } from '@/components/business/ui/FieldLabel';
import { Input } from '@/components/business/ui/Input';
import { Radio } from '@/components/business/ui/Radio';
import { Checkbox } from '@/components/business/ui/Checkbox';
import { Button } from '@/components/business/ui/Button';
import { Badge } from '@/components/business/ui/Badge';
import { Icon } from '@/components/business/ui/Icon';
import { domainsApi } from '@/lib/api-client';
import type { DomainSearchResult, DomainTransferCheckResponse } from '@/types/domains';

type D = BusinessIntakeData['domain'];
type Patch = { domain?: Partial<D> };

export interface BundledDomainStatus {
  eligible: boolean;
  redeemed: boolean;
  redeemed_at: string | null;
  available: boolean;
}

interface Props {
  t: Tokens;
  data: BusinessIntakeData;
  set: (patch: Patch) => void;
  entitlement?: BundledDomainStatus | null;
}

// TLDs covered by the $99/$157 bundled domain entitlement.
// Wholesale at OpenSRS keeps these well within plan margin.
const BUNDLED_TLDS = ['.com', '.net', '.org', '.co', '.us'] as const;

export function StepDomain({ t, data, set, entitlement }: Props) {
  const d = data.domain;
  const update = (patch: Partial<D>) => set({ domain: patch });

  const entitlementUsed = entitlement?.redeemed === true;

  // If the entitlement has already been redeemed, force mode to 'connect'
  // and prevent picking register/transfer (which would consume an entitlement
  // they no longer have).
  useEffect(() => {
    if (entitlementUsed && d.mode !== 'connect') {
      update({ mode: 'connect' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entitlementUsed]);

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<DomainSearchResult[] | null>(null);

  const [transferChecking, setTransferChecking] = useState(false);
  const [transferCheck, setTransferCheck] = useState<DomainTransferCheckResponse | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  const runSearch = async () => {
    const q = (d.search || '').trim().replace(/\..*$/, '');
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    setResults(null);
    try {
      const tldsParam = BUNDLED_TLDS.map((tld) => tld.replace(/^\./, ''));
      const res = await domainsApi.search(q, tldsParam);
      const filtered = (res.lookup || []).filter((r) =>
        BUNDLED_TLDS.some((tld) => r.domain.toLowerCase().endsWith(tld))
      );
      setResults(filtered);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const runTransferCheck = async () => {
    const domain = (d.domain || '').trim().toLowerCase();
    if (!domain || !domain.includes('.')) return;
    setTransferChecking(true);
    setTransferError(null);
    setTransferCheck(null);
    try {
      const res = await domainsApi.checkTransfer(domain);
      setTransferCheck(res);
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : 'Check failed');
    } finally {
      setTransferChecking(false);
    }
  };

  return (
    <div>
      <StepHeader
        t={t}
        eyebrow="Step 3 of 5"
        title="What's your domain story?"
        subtitle="Got a domain already? Bring it along. Need one? We can register it for you."
      />

      {entitlementUsed && (
        <div
          style={{
            marginBottom: 18, padding: '12px 14px',
            borderRadius: 10, background: t.surfaceAlt,
            border: `1px solid ${t.border}`,
            fontFamily: FONT, fontSize: 13, color: t.textMuted,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}
        >
          <Icon name="info" size={16} />
          <div>
            Your plan&apos;s bundled domain has already been used. You can still
            connect another domain you own. Registering or transferring a new
            one would require a separate purchase.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        <Radio
          t={t}
          checked={d.mode === 'transfer'}
          onChange={() => !entitlementUsed && update({ mode: 'transfer' })}
          disabled={entitlementUsed}
          icon={<Icon name="globe" size={18} />}
          label="Transfer a domain I already own"
          description="Move it from GoDaddy, Namecheap, wherever. We handle the EPP code dance."
        />
        <Radio
          t={t}
          checked={d.mode === 'connect'}
          onChange={() => update({ mode: 'connect' })}
          icon={<Icon name="refresh" size={18} />}
          label="Connect a domain without transferring"
          description="Keep it at your current registrar. Just point DNS at us."
        />
        <Radio
          t={t}
          checked={d.mode === 'register'}
          onChange={() => !entitlementUsed && update({ mode: 'register' })}
          disabled={entitlementUsed}
          icon={<Icon name="plus" size={18} />}
          label="Register a new domain"
          description="Included with your plan. Pick from .com, .net, .org, .co, or .us."
        />
      </div>

      {d.mode === 'transfer' && (
        <div style={{ marginTop: 22, display: 'grid', gap: 16 }}>
          <div>
            <FieldLabel t={t} hint="e.g. mycompany.com">Domain to transfer</FieldLabel>
            <Input
              t={t}
              value={d.domain}
              onChange={(v) => {
                update({ domain: v });
                setTransferCheck(null);
                setTransferError(null);
              }}
              onBlur={runTransferCheck}
              placeholder="mycompany.com"
              prefix={<Icon name="globe" size={14} />}
            />
            {transferChecking && (
              <div style={{ marginTop: 6, fontSize: 12, color: t.textMuted }}>
                Checking transferability…
              </div>
            )}
            {transferError && (
              <div style={{ marginTop: 6, fontSize: 12, color: t.danger || '#c0392b' }}>
                {transferError}
              </div>
            )}
            {transferCheck && (
              <div
                style={{
                  marginTop: 8, padding: '8px 12px', borderRadius: 8,
                  background: transferCheck.transferable ? t.accentSoft : t.surfaceAlt,
                  border: `1px solid ${transferCheck.transferable ? t.accent : t.border}`,
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontFamily: FONT, fontSize: 13,
                }}
              >
                <Badge t={t} tone={transferCheck.transferable ? 'success' : 'neutral'} dot>
                  {transferCheck.transferable ? 'Transferable' : 'Not transferable'}
                </Badge>
                {transferCheck.reason && (
                  <span style={{ color: t.textMuted }}>{transferCheck.reason}</span>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel t={t} hint="From your current registrar">Auth / EPP code</FieldLabel>
              <Input
                t={t}
                value={d.epp}
                onChange={(v) => update({ epp: v })}
                placeholder="XXXX-XXXX-XXXX"
                suffix={<Icon name="copy" size={14} />}
              />
            </div>
            <div>
              <FieldLabel t={t}>Current registrar</FieldLabel>
              <Input
                t={t}
                value={d.registrar}
                onChange={(v) => update({ registrar: v })}
                placeholder="GoDaddy, Namecheap, …"
              />
            </div>
          </div>
          <Checkbox
            t={t}
            checked={!!d.unlocked}
            onChange={(v) => update({ unlocked: v })}
            label="My domain is unlocked and eligible for transfer"
            description="Most registrars let you unlock in domain settings. Transfers take up to 5 days."
          />
        </div>
      )}

      {d.mode === 'connect' && (
        <div style={{ marginTop: 22 }}>
          <FieldLabel t={t} hint="We'll give you the records to add">Domain to connect</FieldLabel>
          <Input
            t={t}
            value={d.domain}
            onChange={(v) => update({ domain: v })}
            placeholder="mycompany.com"
            prefix={<Icon name="globe" size={14} />}
          />
        </div>
      )}

      {d.mode === 'register' && (
        <div style={{ marginTop: 22 }}>
          <FieldLabel t={t} hint="Included in your plan: .com, .net, .org, .co, .us">
            Find a domain
          </FieldLabel>
          <Input
            t={t}
            value={d.search}
            onChange={(v) => update({ search: v })}
            onKeyDown={(e) => { if (e.key === 'Enter' && (d.search || '').trim() && !searching) runSearch(); }}
            placeholder="mycompany"
            suffix={
              <Button
                t={t}
                size="sm"
                variant="primary"
                onClick={runSearch}
                disabled={searching || !(d.search || '').trim()}
              >
                {searching ? 'Searching…' : 'Search'}
              </Button>
            }
          />

          {searchError && (
            <div style={{ marginTop: 10, fontSize: 13, color: t.danger || '#c0392b' }}>
              {searchError}
            </div>
          )}

          {results && results.length === 0 && !searching && (
            <div style={{ marginTop: 16, fontSize: 13, color: t.textMuted, fontFamily: FONT }}>
              No results across the included TLDs. Try a different name.
            </div>
          )}

          {results && results.length > 0 && (
            <div
              style={{
                marginTop: 16,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                background: t.surfaceAlt, overflow: 'hidden',
              }}
            >
              {results.map((r, i) => {
                const isAvailable = r.status === 'available';
                const selected = (d.domain || '').toLowerCase() === r.domain.toLowerCase();
                return (
                  <div
                    key={r.domain}
                    role={isAvailable ? 'button' : undefined}
                    onClick={() => {
                      if (isAvailable) update({ domain: r.domain });
                    }}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '12px 16px',
                      borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
                      background: selected ? t.accentSoft : 'transparent',
                      fontFamily: FONT,
                      cursor: isAvailable ? 'pointer' : 'default',
                    }}
                  >
                    <div style={{ flex: 1, fontSize: 14, color: t.text, fontFamily: MONO }}>
                      {r.domain.replace(/\.[^.]+$/, '')}
                      <span style={{ color: t.textMuted }}>
                        {'.' + r.domain.split('.').slice(1).join('.')}
                      </span>
                    </div>
                    {isAvailable ? (
                      <>
                        <span style={{ fontSize: 12, color: t.textMuted, marginRight: 14 }}>
                          Included
                        </span>
                        <Badge t={t} tone="success">
                          {selected ? 'Selected' : 'Available'}
                        </Badge>
                      </>
                    ) : (
                      <Badge t={t} tone="neutral">Taken</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StepDomain;
