'use client';
import type { BusinessIntakeData } from '@/lib/business-intake-store';
import { FONT, type Tokens } from '@/components/business/ui/tokens';
import { StepHeader } from '@/components/business/ui/StepHeader';
import { Card } from '@/components/business/ui/Card';
import { Badge } from '@/components/business/ui/Badge';
import { Icon } from '@/components/business/ui/Icon';
import { SummaryRow } from './SummaryRow';

interface Props {
  t: Tokens;
  data: BusinessIntakeData;
}

// Mirrors BUSINESS_PLAN_FEATURES in lib/plans-config.ts — kept in sync manually
// until plans-config exposes a shared accessor. Update there first, then here.
const PLAN_FEATURES: Record<BusinessIntakeData['planCode'], string[]> = {
  business_starter: [
    'Domain Registration',
    'SSL Certificates',
    'Javelina DNS',
    'Website Hosting (1–3 page site)',
    'Business Email',
    'Fully Managed Business Website',
  ],
  business_pro: [
    'Domain Registration',
    'SSL Certificates',
    'Javelina DNS',
    'Microsoft 365 Email',
    'Business Website (1–5 pages)',
    'Custom AI Agent',
  ],
};

const AESTHETIC_LABEL = {
  bold: 'Bold & editorial',
  simple: 'Simple & professional',
  choose: 'Custom',
} as const;

export function StepConfirm({ t, data }: Props) {
  const dnsLabel =
    data.dns.mode === 'jbp'
      ? 'Javelina managed'
      : data.dns.mode === 'self'
      ? `Self-managed${data.dns.provider ? ` · ${data.dns.provider}` : ''}`
      : 'Skip — use Javelina subdomain';

  const domainLabel =
    data.domain.mode === 'transfer'
      ? `Transfer · ${data.domain.domain || '—'}`
      : data.domain.mode === 'connect'
      ? `Connect · ${data.domain.domain || '—'}`
      : `Register · ${data.domain.search || '—'}.com`;

  const features = PLAN_FEATURES[data.planCode];

  return (
    <div>
      <StepHeader
        t={t}
        eyebrow="Step 5 of 5"
        title="Looks good? Let's ship it."
        subtitle="Review your setup. Your site goes live the moment you confirm."
      />

      <Card t={t} padding={0}>
        <div style={{ padding: '8px 20px' }}>
          <SummaryRow t={t} label="DNS management" value={dnsLabel} />
          <SummaryRow t={t} label="Business" value={data.website.bizName || '—'} />
          <SummaryRow t={t} label="What you do" value={data.website.bizType || '—'} />
          <SummaryRow t={t} label="Aesthetic" value={AESTHETIC_LABEL[data.website.aesthetic]} />
          <SummaryRow t={t} label="Tone" value={data.website.tone || '—'} />
          <SummaryRow
            t={t}
            label="Copy"
            value={data.website.letUsWrite ? 'Javelina will draft for you' : "You'll write it"}
          />
          <SummaryRow t={t} label="Domain" value={domainLabel} mono />
          {data.domain.mode === 'transfer' && (
            <SummaryRow
              t={t}
              label="Auth code"
              value={data.domain.epp ? '••••-••••-' + (data.domain.epp.slice(-4) || 'XXXX') : '—'}
              mono
            />
          )}
          <SummaryRow
            t={t}
            label="Registrant"
            value={[data.contact.firstName, data.contact.lastName].filter(Boolean).join(' ') || '—'}
          />
          <SummaryRow t={t} label="Email" value={data.contact.email || '—'} mono />
          <div
            style={{
              display: 'flex', alignItems: 'flex-start',
              padding: '14px 0', fontFamily: FONT,
            }}
          >
            <div style={{ width: 180, fontSize: 13, color: t.textMuted, fontWeight: 500 }}>
              WHOIS privacy
            </div>
            <Badge t={t} tone={data.contact.whois !== false ? 'success' : 'neutral'} dot>
              {data.contact.whois !== false ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </div>
      </Card>

      <div
        style={{
          marginTop: 20, padding: 16, borderRadius: 12,
          background: t.accentSoft, border: `1px solid ${t.accent}33`,
          display: 'flex', gap: 14, alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: t.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: '#fff',
          }}
        >
          <Icon name="rocket" size={18} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT }}>
            What you're getting ({data.planCode === 'business_pro' ? 'Business Pro' : 'Business Starter'})
          </div>
          <ul style={{ margin: '6px 0 0 18px', padding: 0, color: t.textMuted, fontSize: 13, lineHeight: 1.55, fontFamily: FONT }}>
            {features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default StepConfirm;
