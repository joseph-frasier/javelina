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

  // `plans.metadata.price` is a JSON number, and the enterprise plans carry 0.
  // Gating the price block on its truthiness hid the discounted price, the
  // strikethrough, the "Custom pricing" chip AND the fallback note for exactly
  // the customers this feature exists to serve.
  it('shows the discounted price on a zero-catalog-price plan', async () => {
    getCurrent.mockResolvedValue({
      subscription: { status: 'active' },
      plan: { name: 'Enterprise', billing_interval: 'month', metadata: { price: 0 } },
      effective_pricing: { active: true, effective_cents: 129900, base_cents: 0 },
    });

    render(<SubscriptionManager orgId="org1" />);

    await waitFor(() => expect(screen.getByText('$1299.00')).toBeInTheDocument());
    expect(screen.getByText(/custom pricing/i)).toBeInTheDocument();
  });

  it('omits the strikethrough when the catalog price is not higher than the effective price', async () => {
    // Enterprise catalog price is 0, so a naive strikethrough renders "$0.00"
    // beside the real price and reads as a price increase from free.
    getCurrent.mockResolvedValue({
      subscription: { status: 'active' },
      plan: { name: 'Enterprise', billing_interval: 'month', metadata: { price: 0 } },
      effective_pricing: { active: true, effective_cents: 129900, base_cents: 0 },
    });

    render(<SubscriptionManager orgId="org1" />);

    await waitFor(() => expect(screen.getByText('$1299.00')).toBeInTheDocument());
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });

  it('shows the custom-pricing note on a zero-catalog-price plan', async () => {
    getCurrent.mockResolvedValue({
      subscription: { status: 'active' },
      plan: { name: 'Enterprise', billing_interval: 'month', metadata: { price: 0 } },
      custom_pricing: true,
    });

    render(<SubscriptionManager orgId="org1" />);

    await waitFor(() => expect(screen.getByText(/custom pricing applied/i)).toBeInTheDocument());
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
