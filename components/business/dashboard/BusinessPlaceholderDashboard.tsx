'use client';
import Link from 'next/link';
import type { BusinessIntakeData } from '@/lib/business-intake-store';
import { FONT, t as tokens } from '@/components/business/ui/tokens';
import { Card } from '@/components/business/ui/Card';
import { Badge } from '@/components/business/ui/Badge';
import { SummaryRow } from '@/components/business/wizard/SummaryRow';

interface Props {
  data: BusinessIntakeData;
}

export function BusinessPlaceholderDashboard({ data }: Props) {
  const t = tokens;
  const planLabel = data.planCode === 'business_pro' ? 'Business Pro' : 'Business Starter';
  const primaryDomain =
    data.domain.mode === 'register'
      ? `${data.domain.search || 'your-domain'}.com`
      : data.domain.domain || 'your-domain.com';

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px 80px', fontFamily: FONT }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: t.textMuted, fontWeight: 500 }}>
          {data.website.bizName || 'Your business'}
        </div>
        <h1
          style={{
            margin: '4px 0 0', fontSize: 28, fontWeight: 700,
            color: t.text, letterSpacing: -0.6,
          }}
        >
          Your site is being prepared
        </h1>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <Card t={t}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <Badge t={t} tone="accent" dot>{planLabel}</Badge>
            <span style={{ fontSize: 13, color: t.textMuted }}>{primaryDomain}</span>
          </div>
          <div style={{ fontSize: 14, color: t.text, lineHeight: 1.55 }}>
            Thanks for signing up. Your account manager will reach out within one business day to
            kick off setup. You can edit your intake answers anytime from the link below.
          </div>
          <div style={{ marginTop: 12 }}>
            <Link
              href={`/business/setup?org_id=${data.orgId}&plan_code=${data.planCode}&org_name=${encodeURIComponent(data.website.bizName || '')}`}
              style={{ color: t.accent, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
            >
              Edit setup →
            </Link>
          </div>
        </Card>

        <Card t={t} padding={0}>
          <div style={{ padding: '4px 20px' }}>
            <SummaryRow t={t} label="Plan" value={planLabel} />
            <SummaryRow t={t} label="DNS management" value={
              data.dns.mode === 'jbp' ? 'Javelina managed' :
              data.dns.mode === 'self' ? `Self-managed${data.dns.provider ? ` · ${data.dns.provider}` : ''}` :
              'Skip — use Javelina subdomain'
            } />
            <SummaryRow t={t} label="Domain" value={primaryDomain} mono />
            <SummaryRow t={t} label="Aesthetic" value={
              data.website.aesthetic === 'bold' ? 'Bold & editorial' :
              data.website.aesthetic === 'simple' ? 'Simple & professional' : 'Custom'
            } />
            <SummaryRow t={t} label="Tone" value={data.website.tone || '—'} />
            <SummaryRow
              t={t}
              label="Contact"
              value={[data.contact.firstName, data.contact.lastName].filter(Boolean).join(' ') || '—'}
            />
          </div>
        </Card>

        <Card t={t}>
          <h2
            style={{
              margin: 0, fontSize: 13, fontWeight: 600,
              color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.6,
            }}
          >
            What happens next
          </h2>
          <ol
            style={{
              marginTop: 12, padding: '0 0 0 20px',
              color: t.text, fontSize: 14, lineHeight: 1.6,
            }}
          >
            <li>We provision your domain and SSL.</li>
            <li>Your managed website is built and deployed.</li>
            <li>{data.planCode === 'business_pro' ? 'Microsoft 365 mailboxes are created and credentials sent.' : 'Business email is set up.'}</li>
            <li>We notify you by email when everything is live.</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}

export default BusinessPlaceholderDashboard;
