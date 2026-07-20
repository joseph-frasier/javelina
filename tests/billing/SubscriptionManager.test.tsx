import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubscriptionManager } from '@/components/billing/SubscriptionManager';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/components/modals/ChangePlanModal', () => ({ ChangePlanModal: () => null }));
vi.mock('@/components/billing/UsageMeter', () => ({ UsageMeter: () => null }));

const getCurrent = vi.fn();
vi.mock('@/lib/api-client', () => ({
  subscriptionsApi: { getCurrent: (...a: any[]) => getCurrent(...a) },
}));

describe('SubscriptionManager plan states', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a subscribe CTA (not lifetime) when there is no plan', async () => {
    getCurrent.mockResolvedValue({
      subscription: { status: 'canceled', current_period_end: null },
      plan: null,
    });

    render(<SubscriptionManager orgId="org_1" />);

    expect(await screen.findByText('Choose a Plan')).toBeInTheDocument();
    expect(screen.getByText(/no active plan/i)).toBeInTheDocument();
    expect(screen.queryByText(/Lifetime plan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Loading plan details/i)).not.toBeInTheDocument();
  });

  it('shows the lifetime block for a lifetime plan', async () => {
    getCurrent.mockResolvedValue({
      subscription: { status: 'active' },
      plan: { code: 'premium_lifetime', name: 'Business Lifetime', billing_interval: null, metadata: {} },
    });

    render(<SubscriptionManager orgId="org_1" />);

    expect(await screen.findByText(/Lifetime plan/i)).toBeInTheDocument();
  });

  it('shows Change Plan for a monthly subscription plan', async () => {
    getCurrent.mockResolvedValue({
      subscription: { status: 'active' },
      plan: { code: 'business_starter', name: 'Business Starter', billing_interval: 'month', metadata: {} },
    });

    render(<SubscriptionManager orgId="org_1" />);

    expect(await screen.findByText('Change Plan')).toBeInTheDocument();
  });
});
