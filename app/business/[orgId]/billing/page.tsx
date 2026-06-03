'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FONT } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/stores/business-theme-store';
import { Card } from '@/components/business/ui/Card';
import { Button } from '@/components/business/ui/Button';
import { Badge } from '@/components/business/ui/Badge';
import { Icon } from '@/components/business/ui/Icon';
import { PageHeader, SectionHeader, StatRow } from '@/components/business/dashboard/_pageBits';
import { organizationsApi } from '@/lib/api-client';
import {
  getCurrentSubscription,
  createBillingPortalSession,
  type SubscriptionRow,
  type PlanRow,
} from '@/lib/api/subscriptions';

interface OrgBillingFields {
  billing_email: string | null;
  billing_phone: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
}

function formatAddress(o: OrgBillingFields): string | null {
  const line1 = (o.billing_address || '').trim();
  const city = (o.billing_city || '').trim();
  const state = (o.billing_state || '').trim();
  const zip = (o.billing_zip || '').trim();
  const cityState = [city, state].filter(Boolean).join(', ');
  const tail = [cityState, zip].filter(Boolean).join(' ').trim();
  const parts = [line1, tail].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

function statusToneAndLabel(status?: string): { tone: StatusTone; label: string } {
  switch (status) {
    case 'active':
      return { tone: 'success', label: 'Active' };
    case 'trialing':
      return { tone: 'success', label: 'Trialing' };
    case 'past_due':
      return { tone: 'warning', label: 'Past due' };
    case 'unpaid':
      return { tone: 'danger', label: 'Unpaid' };
    case 'canceled':
      return { tone: 'neutral', label: 'Canceled' };
    case 'incomplete':
      return { tone: 'warning', label: 'Incomplete' };
    case 'incomplete_expired':
      return { tone: 'neutral', label: 'Expired' };
    case 'paused':
      return { tone: 'neutral', label: 'Paused' };
    default:
      return { tone: 'neutral', label: status ? status.replace(/_/g, ' ') : '—' };
  }
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function intervalLabel(interval?: string | null): string {
  if (!interval) return '';
  if (interval === 'month') return 'Monthly';
  if (interval === 'year') return 'Yearly';
  if (interval === 'week') return 'Weekly';
  return interval.charAt(0).toUpperCase() + interval.slice(1);
}

function PlanCardContent({
  t,
  subscription,
  plan,
}: {
  t: ReturnType<typeof useBusinessTheme>;
  subscription: SubscriptionRow | null;
  plan: PlanRow | null;
}) {
  if (!subscription) {
    return (
      <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT }}>
        No active subscription.
      </div>
    );
  }

  const { tone, label: statusLabel } = statusToneAndLabel(subscription.status);
  const interval = intervalLabel(plan?.billing_interval);
  const planName = plan?.name ?? 'Subscription';
  const renews = subscription.cancel_at_period_end ? 'Ends' : 'Renews';
  const periodEnd = formatDate(subscription.current_period_end);
  const trialEnd = subscription.trial_end ? formatDate(subscription.trial_end) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: t.text, fontFamily: FONT, letterSpacing: -0.3 }}>
        {planName}
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Badge t={t} tone={tone} dot>{statusLabel}</Badge>
        {interval && <Badge t={t}>{interval}</Badge>}
        {subscription.cancel_at_period_end && (
          <Badge t={t} tone="warning">Cancels at period end</Badge>
        )}
      </div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {trialEnd && (
          <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT }}>
            Trial ends <strong style={{ color: t.text, fontWeight: 600 }}>{trialEnd}</strong>
          </div>
        )}
        <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT }}>
          {renews} <strong style={{ color: t.text, fontWeight: 600 }}>{periodEnd}</strong>
        </div>
      </div>
    </div>
  );
}

export default function BusinessBillingPage() {
  const t = useBusinessTheme();
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? '';
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const { data: subResult, isLoading } = useQuery({
    queryKey: ['subscription', orgId],
    queryFn: () => getCurrentSubscription(orgId),
    enabled: !!orgId,
  });

  const { data: org } = useQuery<OrgBillingFields>({
    queryKey: ['organization-billing', orgId],
    queryFn: () => organizationsApi.get(orgId),
    enabled: !!orgId,
  });

  const subscription = subResult?.kind === 'ok' ? subResult.subscription : null;
  const plan = subResult?.kind === 'ok' ? subResult.plan : null;

  async function openPortal() {
    if (!orgId || portalLoading) return;
    setPortalError(null);
    setPortalLoading(true);
    const result = await createBillingPortalSession(orgId);
    setPortalLoading(false);
    if ('url' in result) {
      window.location.href = result.url;
    } else {
      setPortalError(result.error);
    }
  }

  return (
    <div>
      <PageHeader
        t={t}
        title="Billing"
        description="Your plan and billing contact. Payment method, tax info, and past invoices are in your billing portal."
      />

      {portalError && (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 14px',
            borderRadius: 8,
            background: t.surfaceAlt,
            border: `1px solid ${t.borderStrong}`,
            color: t.danger,
            fontSize: 13,
            fontFamily: FONT,
          }}
        >
          Couldn&rsquo;t open billing portal: {portalError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card t={t}>
          <SectionHeader t={t} title="Plan" />
          {isLoading ? (
            <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT }}>Loading…</div>
          ) : (
            <PlanCardContent t={t} subscription={subscription} plan={plan} />
          )}
        </Card>

        <Card t={t}>
          <SectionHeader t={t} title="Billing contact" />
          {org ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <StatRow t={t} label="Email" value={org.billing_email || '—'} />
              <StatRow t={t} label="Phone" value={org.billing_phone || '—'} />
              <StatRow t={t} label="Address" value={formatAddress(org) || '—'} />
            </div>
          ) : (
            <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT }}>Loading…</div>
          )}
        </Card>
      </div>

      <Card
        t={t}
        style={{
          marginTop: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT }}>
            Manage payment method, tax info, and invoices
          </div>
          <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT, lineHeight: 1.5 }}>
            Update your card, set a tax ID, and download past invoices as PDFs in your billing portal.
          </div>
        </div>
        <Button
          t={t}
          variant="secondary"
          size="md"
          iconLeft={<Icon name="external" size={14} />}
          onClick={openPortal}
          disabled={portalLoading || !orgId}
        >
          {portalLoading ? 'Opening…' : 'Open billing portal'}
        </Button>
      </Card>
    </div>
  );
}
