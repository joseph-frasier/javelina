'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FONT, MONO } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { useDashboardMode } from '@/lib/hooks/useDashboardMode';
import { Card } from '@/components/business/ui/Card';
import { Button } from '@/components/business/ui/Button';
import { Badge } from '@/components/business/ui/Badge';
import { Icon } from '@/components/business/ui/Icon';
import { PageHeader, SectionHeader, StatRow, TableHeader, TableCell } from '@/components/business/dashboard/_pageBits';
import { EmptyCardState } from '@/components/business/ui/EmptyCardState';
import { MOCK_INVOICES } from '@/lib/business/page-mocks';
import {
  getCurrentSubscription,
  createBillingPortalSession,
  type SubscriptionRow,
  type PlanRow,
} from '@/lib/api/subscriptions';

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
  const { isMock } = useDashboardMode();
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? '';
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const { data: subResult, isLoading } = useQuery({
    queryKey: ['subscription', orgId],
    queryFn: () => getCurrentSubscription(orgId),
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
        description="Plan, payment method, billing history, and add-ons."
        actions={
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
        }
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
          <SectionHeader t={t} title="Payment method" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 56,
                height: 38,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${t.text} 0%, ${t.textMuted} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: 1,
                fontFamily: FONT,
                flexShrink: 0,
              }}
            >
              VISA
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: MONO, letterSpacing: 1 }}>
                •••• •••• •••• 4242
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT }}>Expires 09/29</div>
            </div>
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <StatRow t={t} label="Billing email" value="billing@acme.com" />
            <StatRow t={t} label="Tax status" value="Not exempt" />
          </div>
        </Card>
      </div>

      <Card t={t}>
        <SectionHeader t={t} title="Billing history" />
        {isMock ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 100px',
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <TableHeader t={t}>Reference</TableHeader>
            <TableHeader t={t}>Date</TableHeader>
            <TableHeader t={t}>Amount</TableHeader>
            <TableHeader t={t}>Status</TableHeader>
            {MOCK_INVOICES.map((inv) => (
              <div key={inv.id} style={{ display: 'contents' }}>
                <TableCell t={t} mono accent>{inv.id}</TableCell>
                <TableCell t={t}>{new Date(inv.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                <TableCell t={t}>{inv.amount}</TableCell>
                <TableCell t={t}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: t.success, fontFamily: FONT, textTransform: 'capitalize' }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: t.success, display: 'inline-block' }} />
                    {inv.status}
                  </span>
                </TableCell>
              </div>
            ))}
          </div>
        ) : (
          <EmptyCardState message="Invoice history isn't available yet. It will appear here once billing has run for at least one cycle." />
        )}
      </Card>
    </div>
  );
}
