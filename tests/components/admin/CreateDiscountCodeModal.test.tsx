import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateDiscountCodeModal from '@/components/modals/CreateDiscountCodeModal';
import { TARGET_OPTIONS, type RuleTarget } from '@/components/admin/PricingRuleFields';

// The shared `Dropdown` component (components/ui/Dropdown.tsx) is a custom
// listbox: a trigger `<button>` next to a plain `<label>` (no `htmlFor`),
// which opens a `<ul role="listbox">` of `<button role="option">`s. It is
// not a native `<select>`, so `userEvent.selectOptions` cannot drive it.
// When there are multiple rule rows, the same label text repeats once per
// row, so locate the Nth occurrence rather than assuming a single match.
async function chooseDropdownOption(labelText: string, optionName: RegExp, rowIndex = 0) {
  const labels = screen.getAllByText(labelText);
  const container = labels[rowIndex].parentElement as HTMLElement;
  const trigger = within(container).getByRole('button');
  await userEvent.click(trigger);
  const option = await screen.findByRole('option', { name: optionName });
  await userEvent.click(option);
}

function targetOf(rowIndex: number): RuleTarget {
  const labels = screen.getAllByText('Applies to');
  const container = labels[rowIndex].parentElement as HTMLElement;
  const trigger = within(container).getByRole('button');
  const found = TARGET_OPTIONS.find((o) => trigger.textContent?.includes(o.label));
  if (!found) throw new Error(`Could not resolve target for row ${rowIndex}: "${trigger.textContent}"`);
  return found.value;
}

const create = vi.fn();
vi.mock('@/lib/api-client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api-client')>()),
  discountsApi: {
    create: (...a: any[]) => create(...a),
    list: vi.fn(),
    validate: vi.fn(),
    redeem: vi.fn(),
    deactivate: vi.fn(),
    redemptions: vi.fn(),
  },
}));

const addToast = vi.fn();
vi.mock('@/lib/stores/toast-store', () => ({
  useToastStore: (selector: any) => {
    const store = { addToast };
    return selector ? selector(store) : store;
  },
}));

beforeEach(() => {
  create.mockReset();
  addToast.mockReset();
});

const renderModal = () => render(<CreateDiscountCodeModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />);

const enterCode = async (code: string) => {
  await userEvent.type(screen.getByLabelText(/^code$/i), code);
};

const enterPercent = async (value: string) => {
  const input = screen.getByLabelText(/percentage/i);
  await userEvent.clear(input);
  await userEvent.type(input, value);
};

const enterPrice = async (value: string) => {
  const input = screen.getByLabelText(/custom price/i);
  await userEvent.clear(input);
  await userEvent.type(input, value);
};

const selectDiscountType = async (type: 'percent' | 'waive' | 'price_override', rowIndex = 0) => {
  const optionName =
    type === 'percent' ? /^percentage off$/i : type === 'waive' ? /waive/i : /price override/i;
  await chooseDropdownOption('Discount type', optionName, rowIndex);
};

const selectTarget = async (rowIndex: number, target: Exclude<RuleTarget, 'all'> | 'all') => {
  const opt = TARGET_OPTIONS.find((o) => o.value === target)!;
  const name = target === 'all' ? /all products/i : new RegExp(`^${opt.label}$`, 'i');
  await chooseDropdownOption('Applies to', name, rowIndex);
};

const selectDurationMode = async (mode: 'months' | 'date' | 'open') => {
  const label =
    mode === 'months' ? /relative/i : mode === 'date' ? /absolute/i : /open-ended/i;
  await chooseDropdownOption('Duration type', label);
};

const clickAddRule = async () => {
  await userEvent.click(screen.getByRole('button', { name: /add another product rule/i }));
};

const submit = async () => {
  await userEvent.click(screen.getByRole('button', { name: /create code/i }));
};

describe('CreateDiscountCodeModal validation', () => {
  // value_bps has a CHECK of 1..10000; 0 and 150 percent both violate it and,
  // unvalidated, surface at the admin as a raw 500 instead of an inline error.
  it('refuses a percentage outside 1-100', async () => {
    renderModal();
    await enterCode('SAVE');
    await enterPercent('150');
    await submit();

    expect(addToast).toHaveBeenCalledWith('error', expect.stringMatching(/between 1 and 100/i));
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses a negative custom price', async () => {
    renderModal();
    await enterCode('FLAT');
    await selectDiscountType('price_override');
    await enterPrice('-5');
    // A price override also requires a redemption limit (a separate, earlier
    // gate) — set one so that gate is satisfied and this test isolates the
    // F4 price-bound path rather than incidentally passing because of it.
    await userEvent.type(screen.getByLabelText(/max redemptions/i), '10');
    await submit();

    expect(addToast).toHaveBeenCalledWith('error', expect.stringMatching(/0 or more/i));
    expect(create).not.toHaveBeenCalled();
  });

  // Silently produced duration_months = null AND grant_ends_at = null, i.e. a
  // permanent discount on every org that redeems the code.
  it('refuses a bounded duration mode with a blank value', async () => {
    renderModal();
    await enterCode('OOPS');
    await enterPercent('25');
    await selectDurationMode('months'); // leave the months field empty

    await submit();

    expect(addToast).toHaveBeenCalledWith('error', expect.stringMatching(/enter a number of months/i));
    expect(create).not.toHaveBeenCalled();
  });

  // emptyRuleDraft() (target: 'all') was reused for appended rows too, so a
  // second row landed preselected to 'all' while 'all' was simultaneously
  // disabled in its own dropdown — a state the admin could not fix.
  it('adds new rule rows with a non-conflicting target', async () => {
    renderModal();
    await selectTarget(0, 'plan');
    await clickAddRule();

    expect(targetOf(1)).not.toBe('all');
  });

  // PricingRuleFields is rendered once per rule row; hardcoded ids would
  // collide and misdirect every label after the first (F13). Both rows
  // default to 'percent', so both render a "Percentage (%)" field — their
  // ids must differ, and each label must resolve to its own row's input.
  it('gives each rule row distinct field ids', async () => {
    renderModal();
    await selectTarget(0, 'plan');
    await clickAddRule();
    await selectTarget(1, 'domain');

    const inputs = screen.getAllByLabelText(/percentage/i);
    expect(inputs).toHaveLength(2);

    const ids = inputs.map((el) => el.id);
    expect(ids[0]).not.toBe('');
    expect(ids[1]).not.toBe('');
    expect(ids[0]).not.toBe(ids[1]);
  });

  // With rows on all three categories (plan/domain/mailbox), there is no
  // non-conflicting target left for a 4th row — the button must go disabled
  // rather than let nextRuleDraft's fallback hand out a duplicate target.
  it('disables adding a rule once every product category is used', async () => {
    renderModal();
    await selectTarget(0, 'plan');
    await clickAddRule();
    await selectTarget(1, 'domain');
    await clickAddRule();
    await selectTarget(2, 'mailbox');

    expect(screen.getAllByText('Applies to')).toHaveLength(3);
    const addButton = screen.getByRole('button', { name: /add another product rule/i }) as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);

    await clickAddRule();

    expect(screen.getAllByText('Applies to')).toHaveLength(3);
  });
});
