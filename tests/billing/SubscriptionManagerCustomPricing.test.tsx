import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('SubscriptionManager custom pricing note', () => {
  beforeEach(() => getCurrent.mockReset());

  it('shows the custom-pricing note when flagged', async () => {
    getCurrent.mockResolvedValue({
      subscription: { status: 'active' },
      plan: { name: 'Business', billing_interval: 'month', metadata: { price: '49.00' } },
      custom_pricing: true,
    });

    render(<SubscriptionManager orgId="org1" />);

    await waitFor(() => expect(screen.getByText(/custom pricing applied/i)).toBeInTheDocument());
    expect(screen.getByText('Business')).toBeInTheDocument();
  });

  it('does not show the note otherwise', async () => {
    getCurrent.mockResolvedValue({
      subscription: { status: 'active' },
      plan: { name: 'Business', billing_interval: 'month', metadata: { price: '49.00' } },
    });

    render(<SubscriptionManager orgId="org1" />);

    await waitFor(() => expect(screen.getByText('Business')).toBeInTheDocument());
    expect(screen.queryByText(/custom pricing applied/i)).not.toBeInTheDocument();
  });
});
