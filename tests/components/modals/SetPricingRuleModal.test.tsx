import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
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

  it('grays out (disables) product-specific targets when a baseline rule is active', async () => {
    render(<SetPricingRuleModal isOpen orgId="org1" hasBaseline onClose={vi.fn()} onSaved={vi.fn()} />);
    const container = screen.getByText('Applies to').parentElement as HTMLElement;
    await userEvent.click(within(container).getByRole('button'));
    // All targets remain visible (discoverable)...
    expect(await screen.findByRole('option', { name: /all products/i })).toBeEnabled();
    // ...but the conflicting ones are disabled, not hidden.
    expect(screen.getByRole('option', { name: /^plan$/i })).toBeDisabled();
    expect(screen.getByRole('option', { name: /domains/i })).toBeDisabled();
  });

  it('grays out (disables) the all-products target when a product-specific rule is active', async () => {
    render(<SetPricingRuleModal isOpen orgId="org1" hasCategoryRules onClose={vi.fn()} onSaved={vi.fn()} />);
    const container = screen.getByText('Applies to').parentElement as HTMLElement;
    await userEvent.click(within(container).getByRole('button'));
    expect(await screen.findByRole('option', { name: /^plan$/i })).toBeEnabled();
    expect(screen.getByRole('option', { name: /all products/i })).toBeDisabled();
  });

  describe('scheduling a future start over an existing rule', () => {
    // Saving archives the current rule for that target and inserts the new one,
    // so a future `effective_from` ends today's discount NOW and leaves a gap
    // until the new rate begins. The admin has no way to know that from the
    // form. Warn, but let them proceed.
    // A datetime-local value is LOCAL time — `new Date(value)` parses it in the
    // browser's zone. Building these from toISOString() would shift them by the
    // UTC offset and silently flip past/future in any non-UTC zone.
    const toLocalInput = (d: Date) => {
      const p = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
    };
    const future = () => toLocalInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const past = () => toLocalInput(new Date(Date.now() - 60 * 60 * 1000));

    const setEffectiveFrom = async (value: string) => {
      const input = screen.getByLabelText(/effective from/i);
      fireEvent.change(input, { target: { value } });
    };

    it('warns when the selected target already has an active rule', async () => {
      render(
        <SetPricingRuleModal
          isOpen orgId="org1" hasCategoryRules activeTargets={['plan']}
          onClose={vi.fn()} onSaved={vi.fn()}
        />,
      );
      await chooseDropdownOption('Applies to', /^plan$/i);
      await setEffectiveFrom(future());

      expect(await screen.findByRole('alert')).toHaveTextContent(/ends? (the current discount )?immediately|current rule .*immediately/i);
    });

    it('does not warn when that target has no active rule', async () => {
      render(
        <SetPricingRuleModal
          isOpen orgId="org1" hasCategoryRules activeTargets={['mailbox']}
          onClose={vi.fn()} onSaved={vi.fn()}
        />,
      );
      await chooseDropdownOption('Applies to', /^plan$/i);
      await setEffectiveFrom(future());

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('does not warn for a start date that is not in the future', async () => {
      render(
        <SetPricingRuleModal
          isOpen orgId="org1" hasCategoryRules activeTargets={['plan']}
          onClose={vi.fn()} onSaved={vi.fn()}
        />,
      );
      await chooseDropdownOption('Applies to', /^plan$/i);
      await setEffectiveFrom(past());

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('still lets the admin save through the warning', async () => {
      create.mockResolvedValue({ id: 'rule9' });
      const onSaved = vi.fn();
      render(
        <SetPricingRuleModal
          isOpen orgId="org1" hasCategoryRules activeTargets={['plan']}
          onClose={vi.fn()} onSaved={onSaved}
        />,
      );
      await chooseDropdownOption('Applies to', /^plan$/i);
      await chooseDropdownOption('Discount type', /^percentage off$/i);
      await userEvent.type(screen.getByLabelText(/percentage/i), '20');
      await setEffectiveFrom(future());
      expect(await screen.findByRole('alert')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
    });
  });
});
