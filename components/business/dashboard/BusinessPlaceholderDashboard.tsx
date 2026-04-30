'use client';

import Link from 'next/link';
import type { BusinessIntakeData } from '@/lib/business-intake-store';
import { FONT } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Button } from '@/components/business/ui/Button';
import { Icon } from '@/components/business/ui/Icon';
import { Card } from '@/components/business/ui/Card';
import { SitePreview } from './SitePreview';
import { DNSStatusCard } from './DNSStatusCard';
import { BillingCard } from './BillingCard';
import { AnalyticsPlaceholder } from './AnalyticsPlaceholder';

interface Props {
  data: BusinessIntakeData;
}

export function BusinessPlaceholderDashboard({ data }: Props) {
  const t = useBusinessTheme();
  const firstName = data.contact.firstName || data.website.bizName || 'there';

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: t.textMuted, fontWeight: 500, fontFamily: FONT }}>
            Welcome back, {firstName}
          </div>
          <h1
            style={{
              margin: '4px 0 0',
              fontSize: 28,
              fontWeight: 700,
              color: t.text,
              letterSpacing: -0.6,
              fontFamily: FONT,
            }}
          >
            Your business
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href={`/business/setup?org_id=${data.orgId}&plan_code=${data.planCode}&org_name=${encodeURIComponent(
              data.website.bizName || '',
            )}`}
            style={{ textDecoration: 'none' }}
          >
            <Button t={t} variant="secondary" size="md" iconLeft={<Icon name="edit" size={14} />}>
              Edit setup
            </Button>
          </Link>
          <Button t={t} size="md" iconLeft={<Icon name="plus" size={14} color="#fff" />}>
            New deploy
          </Button>
        </div>
      </div>

      <SitePreview t={t} data={data} />

      <div
        style={{
          marginTop: 28,
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 16,
        }}
      >
        <DNSStatusCard t={t} data={data} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AnalyticsPlaceholder t={t} />
          <BillingCard t={t} data={data} />
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <Card t={t}>
          <h2
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: t.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              fontFamily: FONT,
            }}
          >
            What happens next
          </h2>
          <ol
            style={{
              marginTop: 12,
              padding: '0 0 0 20px',
              color: t.text,
              fontSize: 14,
              lineHeight: 1.6,
              fontFamily: FONT,
            }}
          >
            <li>We provision your domain and SSL.</li>
            <li>Your managed website is built and deployed.</li>
            <li>
              {data.planCode === 'business_pro'
                ? 'Microsoft 365 mailboxes are created and credentials sent.'
                : 'Business email is set up.'}
            </li>
            <li>We notify you by email when everything is live.</li>
          </ol>
        </Card>
      </div>
    </>
  );
}

export default BusinessPlaceholderDashboard;
