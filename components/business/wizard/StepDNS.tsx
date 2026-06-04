'use client';
import { useEffect } from 'react';
import type { BusinessIntakeData } from '@/lib/stores/business-intake-store';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';
import { StepHeader } from '@/components/business/ui/StepHeader';
import { Radio } from '@/components/business/ui/Radio';
import { Icon } from '@/components/business/ui/Icon';

type Patch = { dns?: Partial<BusinessIntakeData['dns']> };

interface Props {
  t: Tokens;
  data: BusinessIntakeData;
  set: (patch: Patch) => void;
}

export function StepDNS({ t, data, set }: Props) {
  // 'self' and 'skip' are no longer supported options; coerce any persisted state to 'jbp'.
  useEffect(() => {
    if (data.dns.mode === 'self' || data.dns.mode === 'skip') {
      set({ dns: { mode: 'jbp' } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <StepHeader
        t={t}
        eyebrow="Step 1 of 5"
        title="How do you want to manage DNS?"
        subtitle="Choose who's in charge of your DNS records. You can always switch later. Nothing here is permanent."
      />
      <div style={{ display: 'grid', gap: 12 }}>
        <Radio
          t={t}
          checked={data.dns.mode === 'jbp'}
          onChange={() => set({ dns: { mode: 'jbp' } })}
          icon={<Icon name="sparkle" size={18} />}
          label="Let Javelina manage it (recommended)"
          description="We'll point your domain at our nameservers and wire up everything (A, AAAA, CNAME, MX) automatically."
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
            You&apos;ll update nameservers at your registrar to{' '}
            <span
              style={{
                fontFamily: MONO, fontSize: 12,
                background: t.surface, padding: '2px 6px',
                borderRadius: 4, border: `1px solid ${t.border}`,
              }}
            >
              ns1.javelina.cc
            </span>{' '}
            and{' '}
            <span
              style={{
                fontFamily: MONO, fontSize: 12,
                background: t.surface, padding: '2px 6px',
                borderRadius: 4, border: `1px solid ${t.border}`,
              }}
            >
              ns2.javelina.me
            </span>
            . Propagation usually takes 15 minutes to an hour.
          </div>
        </div>
      )}

    </div>
  );
}

export default StepDNS;
