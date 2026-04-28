'use client';
import type { BusinessIntakeData } from '@/lib/business-intake-store';
import { FONT, type Tokens } from '@/components/business/ui/tokens';
import { StepHeader } from '@/components/business/ui/StepHeader';
import { FieldLabel } from '@/components/business/ui/FieldLabel';
import { Input } from '@/components/business/ui/Input';
import { Toggle } from '@/components/business/ui/Toggle';
import { Icon } from '@/components/business/ui/Icon';

type C = BusinessIntakeData['contact'];
type Patch = { contact?: Partial<C> };

interface Props {
  t: Tokens;
  data: BusinessIntakeData;
  set: (patch: Patch) => void;
}

export function StepContact({ t, data, set }: Props) {
  const c = data.contact;
  const update = (patch: Partial<C>) => set({ contact: patch });

  return (
    <div>
      <StepHeader
        t={t}
        eyebrow="Step 4 of 5"
        title="Registrar contact details"
        subtitle="ICANN requires accurate contact info on every domain. This stays private — we enable WHOIS privacy by default."
      />

      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel t={t}>First name</FieldLabel>
            <Input t={t} value={c.firstName} onChange={(v) => update({ firstName: v })} placeholder="Jordan" />
          </div>
          <div>
            <FieldLabel t={t}>Last name</FieldLabel>
            <Input t={t} value={c.lastName} onChange={(v) => update({ lastName: v })} placeholder="Keller" />
          </div>
        </div>

        <div>
          <FieldLabel t={t} optional>Organization</FieldLabel>
          <Input t={t} value={c.org} onChange={(v) => update({ org: v })} placeholder="Keller Studio, LLC" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel t={t}>Email</FieldLabel>
            <Input
              t={t}
              type="email"
              value={c.email}
              onChange={(v) => update({ email: v })}
              placeholder="jordan@example.com"
            />
          </div>
          <div>
            <FieldLabel t={t}>Phone</FieldLabel>
            <Input
              t={t}
              type="tel"
              value={c.phone}
              onChange={(v) => update({ phone: v })}
              placeholder="+1 (555) 010-0110"
            />
          </div>
        </div>

        <div>
          <FieldLabel t={t}>Street address</FieldLabel>
          <Input t={t} value={c.address} onChange={(v) => update({ address: v })} placeholder="1148 Mission St" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel t={t}>City</FieldLabel>
            <Input t={t} value={c.city} onChange={(v) => update({ city: v })} placeholder="San Francisco" />
          </div>
          <div>
            <FieldLabel t={t}>State</FieldLabel>
            <Input t={t} value={c.state} onChange={(v) => update({ state: v })} placeholder="CA" />
          </div>
          <div>
            <FieldLabel t={t}>Postal</FieldLabel>
            <Input t={t} value={c.zip} onChange={(v) => update({ zip: v })} placeholder="94103" />
          </div>
        </div>

        <div
          style={{
            marginTop: 4, padding: 14,
            background: t.surfaceAlt, borderRadius: 10,
            border: `1px solid ${t.border}`,
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}
        >
          <div style={{ color: t.textMuted, marginTop: 1 }}>
            <Icon name="lock" size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: FONT }}>
              WHOIS privacy is on
            </div>
            <div
              style={{
                fontSize: 12.5, color: t.textMuted,
                fontFamily: FONT, marginTop: 2, lineHeight: 1.5,
              }}
            >
              Your personal details won&apos;t show up in public WHOIS lookups. Registrars see them — nobody else.
            </div>
          </div>
          <Toggle t={t} checked={c.whois !== false} onChange={(v) => update({ whois: v })} />
        </div>
      </div>
    </div>
  );
}

export default StepContact;
