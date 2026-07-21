import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SetPricingRuleModal from '@/components/modals/SetPricingRuleModal';

const create = vi.fn();
vi.mock('@/lib/api-client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api-client')>()),
  pricingApi: { create: (...a: any[]) => create(...a), list: vi.fn(), archive: vi.fn() },
}));
vi.mock('@/lib/stores/toast-store', () => ({
  useToastStore: (selector: any) => {
    const store = { addToast: vi.fn() };
    return selector ? selector(store) : store;
  },
}));

beforeEach(() => create.mockReset());

describe('SetPricingRuleModal', () => {
  it('submits a percent rule for domains as basis points', async () => {
    create.mockResolvedValue({ id: 'rule1' });
    const onSaved = vi.fn();
    render(<SetPricingRuleModal isOpen orgId="org1" onClose={vi.fn()} onSaved={onSaved} />);

    await userEvent.selectOptions(screen.getByLabelText(/applies to/i), 'domain');
    await userEvent.selectOptions(screen.getByLabelText(/discount type/i), 'percent');
    await userEvent.type(screen.getByLabelText(/percentage/i), '40');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(create).toHaveBeenCalledWith('org1', expect.objectContaining({
      scope: 'category', category: 'domain', discount_type: 'percent', value_bps: 4000,
    })));
    expect(onSaved).toHaveBeenCalled();
  });

  it('submits a price override in cents', async () => {
    create.mockResolvedValue({ id: 'rule2' });
    render(<SetPricingRuleModal isOpen orgId="org1" onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText(/applies to/i), 'plan');
    await userEvent.selectOptions(screen.getByLabelText(/discount type/i), 'price_override');
    await userEvent.type(screen.getByLabelText(/custom price/i), '99');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(create).toHaveBeenCalledWith('org1', expect.objectContaining({
      scope: 'category', category: 'plan', discount_type: 'price_override', value_cents: 9900,
    })));
  });

  it('waive submits no value fields', async () => {
    create.mockResolvedValue({ id: 'rule3' });
    render(<SetPricingRuleModal isOpen orgId="org1" onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText(/applies to/i), 'all');
    await userEvent.selectOptions(screen.getByLabelText(/discount type/i), 'waive');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(create).toHaveBeenCalledWith('org1', expect.objectContaining({
      scope: 'all', category: null, discount_type: 'waive',
    })));
    const arg = create.mock.calls[0][1];
    expect(arg.value_bps ?? null).toBeNull();
    expect(arg.value_cents ?? null).toBeNull();
  });
});
