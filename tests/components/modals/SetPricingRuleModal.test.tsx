import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SetPricingRuleModal from '@/components/modals/SetPricingRuleModal';

// The shared `Dropdown` component (components/ui/Dropdown.tsx) is a custom
// listbox: a trigger `<button>` next to a plain `<label>` (no `htmlFor`),
// which opens a `<ul role="listbox">` of `<button role="option">`s. It is
// not a native `<select>`, so `userEvent.selectOptions` cannot drive it.
// Locate the trigger by its label text, then click to open and pick the
// option by its visible label.
async function chooseDropdownOption(labelText: string, optionName: RegExp) {
  const label = screen.getByText(labelText);
  const container = label.parentElement as HTMLElement;
  const trigger = within(container).getByRole('button');
  await userEvent.click(trigger);
  const option = await screen.findByRole('option', { name: optionName });
  await userEvent.click(option);
}

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

    await chooseDropdownOption('Applies to', /domains/i);
    await chooseDropdownOption('Discount type', /^percentage off$/i);
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
    await chooseDropdownOption('Applies to', /^plan$/i);
    await chooseDropdownOption('Discount type', /price override/i);
    await userEvent.type(screen.getByLabelText(/custom price/i), '99');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(create).toHaveBeenCalledWith('org1', expect.objectContaining({
      scope: 'category', category: 'plan', discount_type: 'price_override', value_cents: 9900,
    })));
  });

  it('waive submits no value fields', async () => {
    create.mockResolvedValue({ id: 'rule3' });
    render(<SetPricingRuleModal isOpen orgId="org1" onClose={vi.fn()} onSaved={vi.fn()} />);
    await chooseDropdownOption('Applies to', /all products/i);
    await chooseDropdownOption('Discount type', /waive/i);
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(create).toHaveBeenCalledWith('org1', expect.objectContaining({
      scope: 'all', category: null, discount_type: 'waive',
    })));
    const arg = create.mock.calls[0][1];
    expect(arg.value_bps ?? null).toBeNull();
    expect(arg.value_cents ?? null).toBeNull();
  });

  it('offers only the all-products target when a baseline rule is active', async () => {
    render(<SetPricingRuleModal isOpen orgId="org1" hasBaseline onClose={vi.fn()} onSaved={vi.fn()} />);
    const container = screen.getByText('Applies to').parentElement as HTMLElement;
    await userEvent.click(within(container).getByRole('button'));
    expect(await screen.findByRole('option', { name: /all products/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^plan$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /domains/i })).not.toBeInTheDocument();
  });

  it('excludes the all-products target when a product-specific rule is active', async () => {
    render(<SetPricingRuleModal isOpen orgId="org1" hasCategoryRules onClose={vi.fn()} onSaved={vi.fn()} />);
    const container = screen.getByText('Applies to').parentElement as HTMLElement;
    await userEvent.click(within(container).getByRole('button'));
    expect(await screen.findByRole('option', { name: /^plan$/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /all products/i })).not.toBeInTheDocument();
  });
});
