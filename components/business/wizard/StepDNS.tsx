'use client';
import type { BusinessIntakeData } from '@/lib/business-intake-store';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';
import { StepHeader } from '@/components/business/ui/StepHeader';
import { FieldLabel } from '@/components/business/ui/FieldLabel';
import { Radio } from '@/components/business/ui/Radio';
import { Icon } from '@/components/business/ui/Icon';

type Patch = { dns?: Partial<BusinessIntakeData['dns']> };

interface Props {
  t: Tokens;
  data: BusinessIntakeData;
  set: (patch: Patch) => void;
}

const PROVIDERS = ['Cloudflare', 'Route 53', 'Google', 'Other'] as const;

export function StepDNS({ t, data, set }: Props) {
  return (
    <div>
      <StepHeader
        t={t}
        eyebrow="Step 1 of 5"
        title="How do you want to manage DNS?"
        subtitle="Choose who's in charge of your DNS records. You can always switch later — nothing here is permanent."
      />
      <div style={{ display: 'grid', gap: 12 }}>
        <Radio
          t={t}
          checked={data.dns.mode === 'jbp'}
          onChange={() => set({ dns: { mode: 'jbp' } })}
          icon={<Icon name="sparkle" size={18} />}
          label="Let Javelina manage it (recommended)"
          description="We'll point your domain at our nameservers and wire up everything — A, AAAA, CNAME, MX — automatically."
        />
        <Radio
          t={t}
          checked={data.dns.mode === 'self'}
          onChange={() => set({ dns: { mode: 'self' } })}
          icon={<Icon name="server" size={18} />}
          label="I'll manage my own DNS"
          description="Keep your current DNS provider (Cloudflare, Route 53, etc). We'll give you the records to add."
        />
        <Radio
          t={t}
          checked={data.dns.mode === 'skip'}
          onChange={() => set({ dns: { mode: 'skip' } })}
          icon={<Icon name="globe" size={18} />}
          label="Skip for now"
          description="Your site will live at a Javelina subdomain. You can add a custom domain whenever you're ready."
        />
      </div>

      {data.dns.mode === 'jbp' && (
        <div
          style={{
            marginTop: 20, padding: 16,
            background: t.accentSoft, borderRadius: 10,
            border: `1px solid ${t.accent}22`,
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}
        >
          <div style={{ color: t.accent, marginTop: 2 }}><Icon name="info" size={16} /></div>
          <div style={{ fontSize: 13, color: t.text, fontFamily: FONT, lineHeight: 1.5 }}>
            You'll update nameservers at your registrar to{' '}
            <span
              style={{
                fontFamily: MONO, fontSize: 12,
                background: t.surface, padding: '2px 6px',
                borderRadius: 4, border: `1px solid ${t.border}`,
              }}
            >
              ns1.javelina.app
            </span>{' '}
            and{' '}
            <span
              style={{
                fontFamily: MONO, fontSize: 12,
                background: t.surface, padding: '2px 6px',
                borderRadius: 4, border: `1px solid ${t.border}`,
              }}
            >
              ns2.javelina.app
            </span>
            . Propagation usually takes 15 minutes to an hour.
          </div>
        </div>
      )}

      {data.dns.mode === 'self' && (
        <div style={{ marginTop: 20 }}>
          <FieldLabel t={t}>Current DNS provider</FieldLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {PROVIDERS.map((p) => {
              const on = data.dns.provider === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => set({ dns: { provider: p } })}
                  style={{
                    padding: '10px 12px', borderRadius: 8,
                    fontFamily: FONT, fontSize: 13,
                    background: on ? t.accentSoft : t.surface,
                    border: `1.5px solid ${on ? t.accent : t.border}`,
                    color: on ? t.accent : t.text,
                    cursor: 'pointer', fontWeight: 550,
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default StepDNS;
