'use client';

import { useMemo } from 'react';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import type { DiscountCodeRuleInput, PricingCategory, PricingDiscountType } from '@/lib/api-client';

export type RuleTarget = 'all' | PricingCategory;

export interface RuleDraft {
  target: RuleTarget;
  discount_type: PricingDiscountType;
  /** Percent as typed, e.g. "20" for 20%. Converted to bps on submit. */
  percent: string;
  /** Dollars as typed, e.g. "99.00". Converted to cents on submit. */
  price: string;
}

export function emptyRuleDraft(): RuleDraft {
  return { target: 'all', discount_type: 'percent', percent: '', price: '' };
}

// Unit conversion lives here, and only here — no float ever leaves this
// function. `value_bps`/`value_cents` are the integer units the backend
// stores; `percent`/`price` are the strings the admin actually typed.
export function draftToRuleInput(draft: RuleDraft): DiscountCodeRuleInput {
  const scope = draft.target === 'all' ? 'all' : 'category';
  const category = draft.target === 'all' ? null : draft.target;

  if (draft.discount_type === 'percent') {
    return { scope, category, discount_type: 'percent', value_bps: Math.round(Number(draft.percent) * 100) };
  }
  if (draft.discount_type === 'price_override') {
    return { scope, category, discount_type: 'price_override', value_cents: Math.round(Number(draft.price) * 100) };
  }
  return { scope, category, discount_type: 'waive' };
}

export const TARGET_OPTIONS: { value: RuleTarget; label: string }[] = [
  { value: 'all', label: 'All products (baseline)' },
  { value: 'plan', label: 'Plan' },
  { value: 'mailbox', label: 'Mailboxes' },
  { value: 'domain', label: 'Domains' },
];

export const DISCOUNT_TYPE_OPTIONS: { value: PricingDiscountType; label: string }[] = [
  { value: 'percent', label: 'Percentage off' },
  { value: 'waive', label: 'Waive (100% off)' },
  { value: 'price_override', label: 'Price override' },
];

interface Props {
  value: RuleDraft;
  onChange: (next: RuleDraft) => void;
  /** Targets that would conflict with an already-active rule — shown, not hidden. */
  disabledTargets?: RuleTarget[];
  /** Hover/title text explaining why the disabled targets above are disabled. */
  disabledReason?: string;
}

export default function PricingRuleFields({
  value,
  onChange,
  disabledTargets = [],
  disabledReason,
}: Props) {
  // An all-products rule and product-specific rules are mutually exclusive.
  // Keep every target visible but gray out the ones that would conflict, with
  // a hover reason — so the constraint is discoverable, not hidden. The backend
  // also rejects a conflicting rule with 409 as the source of truth.
  const targetOptions = useMemo(
    () =>
      TARGET_OPTIONS.map((o) => {
        const disabled = disabledTargets.includes(o.value);
        return { ...o, disabled, title: disabled ? disabledReason : undefined };
      }),
    [disabledTargets, disabledReason],
  );

  return (
    <>
      <Dropdown
        label="Applies to"
        value={value.target}
        options={targetOptions}
        onChange={(v) => onChange({ ...value, target: v as RuleTarget })}
      />

      <Dropdown
        label="Discount type"
        value={value.discount_type}
        options={DISCOUNT_TYPE_OPTIONS}
        onChange={(v) => onChange({ ...value, discount_type: v as PricingDiscountType })}
      />

      {value.discount_type === 'percent' && (
        <Input
          id="pricing-rule-percentage"
          type="number"
          label="Percentage (%)"
          value={value.percent}
          onChange={(e) => onChange({ ...value, percent: e.target.value })}
          min={0}
          max={100}
          step={0.01}
        />
      )}

      {value.discount_type === 'price_override' && (
        <Input
          id="pricing-rule-custom-price"
          type="number"
          label="Custom price ($)"
          value={value.price}
          onChange={(e) => onChange({ ...value, price: e.target.value })}
          min={0}
          step={0.01}
        />
      )}
    </>
  );
}
