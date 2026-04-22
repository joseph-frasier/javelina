'use client';
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

type D = BusinessIntakeData['domain'];
type Patch = { domain?: Partial<D> };

interface Props {
  t: Tokens;
  data: BusinessIntakeData;
  set: (patch: Patch) => void;
}

const MOCK_TLDS = ['.com', '.app', '.io', '.dev'] as const;
const MOCK_PRICES: Record<string, string> = {
  '.com': '$14.99',
  '.app': '$18.00',
  '.io': '$39.50',
  '.dev': '$15.00',
};

export function StepDomain({ t, data, set }: Props) {
  const d = data.domain;
  const update = (patch: Partial<D>) => set({ domain: patch });

  return (
    <div>
      <StepHeader
        t={t}
        eyebrow="Step 3 of 5"
        title="What's your domain story?"
        subtitle="Got a domain already? Bring it along. Need one? We can register it for you."
      />
      <div style={{ display: 'grid', gap: 12 }}>
        <Radio
          t={t}
          checked={d.mode === 'transfer'}
          onChange={() => update({ mode: 'transfer' })}
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
          onChange={() => update({ mode: 'register' })}
          icon={<Icon name="plus" size={18} />}
          label="Register a new domain"
          description="Search and buy a fresh one — billed alongside your plan."
        />
      </div>

      {d.mode === 'transfer' && (
        <div style={{ marginTop: 22, display: 'grid', gap: 16 }}>
          <div>
            <FieldLabel t={t} hint="e.g. mycompany.com">Domain to transfer</FieldLabel>
            <Input
              t={t}
              value={d.domain}
              onChange={(v) => update({ domain: v })}
              placeholder="mycompany.com"
              prefix={<Icon name="globe" size={14} />}
            />
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
          <FieldLabel t={t} hint="From $12/yr">Find a domain</FieldLabel>
          <Input
            t={t}
            value={d.search}
            onChange={(v) => update({ search: v })}
            placeholder="mycompany"
            suffix={
              <Button t={t} size="sm" variant="primary">
                Search
              </Button>
            }
          />

          {d.search && (
            <div
              style={{
                marginTop: 16,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                background: t.surfaceAlt, overflow: 'hidden',
              }}
            >
              {MOCK_TLDS.map((ext, i) => {
                const available = i !== 0; // .com always taken for mock
                return (
                  <div
                    key={ext}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '12px 16px',
                      borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
                      fontFamily: FONT,
                    }}
                  >
                    <div style={{ flex: 1, fontSize: 14, color: t.text, fontFamily: MONO }}>
                      {d.search}
                      <span style={{ color: t.textMuted }}>{ext}</span>
                    </div>
                    {available ? (
                      <>
                        <span style={{ fontSize: 13, color: t.textMuted, marginRight: 14 }}>
                          {MOCK_PRICES[ext]}/yr
                        </span>
                        <Badge t={t} tone="success" dot>Available</Badge>
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
