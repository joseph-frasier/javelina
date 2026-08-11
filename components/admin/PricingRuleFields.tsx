'use client';

import { useId, useMemo } from 'react';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import type { DiscountCodeRuleInput, PricingCategory, PricingDiscountType } from '@/lib/api-client';

export type RuleTarget = 'all' | PricingCategory;

/** Every non-'all' target a rule can apply to. */
export const CATEGORY_TARGETS: RuleTarget[] = ['plan', 'domain', 'mailbox'];

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

/**
 * A row added alongside existing rules. Defaults to the first category not
 * already used — never 'all', which is mutually exclusive with category rules
 * and would arrive preselected-but-disabled. Returns null once every category
 * is already used — callers must gate the "add rule" action on that (e.g. via
 * `CATEGORY_TARGETS.length`) so this is never called in that state; there is
 * no safe fallback target to hand back, since any target returned here would
 * be a duplicate of an existing row.
 */
export function nextRuleDraft(used: RuleTarget[]): RuleDraft | null {
  const free = CATEGORY_TARGETS.find((t) => !used.includes(t));
  if (!free) return null;
  return { target: free, discount_type: 'percent', percent: '', price: '' };
}

// Unit conversion lives here, and only here — no float ever leaves this
// function. `value_bps`/`value_cents` are the integer units the backend
// stores; `percent`/`price` are the strings the admin actually typed.
export function draftToRuleInput(draft: RuleDraft): DiscountCodeRuleInput {
  const scope = draft.target === 'all' ? 'all' : 'category';
  const category = draft.target === 'all' ? null : draft.target;

  if (draft.discount_type === 'percent') {
    // Number.parseFloat('') and Number.parseFloat('abc') both yield NaN, so a
    // blank or non-numeric field is caught here rather than silently becoming
    // value_bps: NaN in the payload. Callers that pre-validate (the modal) never
    // reach this throw; callers that don't get a clear, immediate error instead.
    const percent = Number.parseFloat(draft.percent);
    if (!Number.isFinite(percent)) throw new Error('Percent must be a number');
    return { scope, category, discount_type: 'percent', value_bps: Math.round(percent * 100) };
  }
  if (draft.discount_type === 'price_override') {
    const price = Number.parseFloat(draft.price);
    if (!Number.isFinite(price)) throw new Error('Price must be a number');
    return { scope, category, discount_type: 'price_override', value_cents: Math.round(price * 100) };
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
  /** Disables all four fields, e.g. while a parent form is saving. Individual
   *  targets already disabled via `disabledTargets` stay disabled either way —
   *  this is combined with, not a replacement for, that per-option state. */
  disabled?: boolean;
}

export default function PricingRuleFields({
  value,
  onChange,
  disabledTargets = [],
  disabledReason,
  disabled = false,
}: Props) {
  // Rendered once per rule row — hardcoded ids would collide and misdirect
  // every label after the first.
  const fieldId = useId();

  // An all-products rule and product-specific rules are mutually exclusive.
  // Keep every target visible but gray out the ones that would conflict, with
  // a hover reason — so the constraint is discoverable, not hidden. The backend
  // also rejects a conflicting rule with 409 as the source of truth.
  const targetOptions = useMemo(
    () =>
      TARGET_OPTIONS.map((o) => {
        const conflicts = disabledTargets.includes(o.value);
        return { ...o, disabled: disabled || conflicts, title: conflicts ? disabledReason : undefined };
      }),
    [disabledTargets, disabledReason, disabled],
  );

  return (
    <>
      <Dropdown
        label="Applies to"
        value={value.target}
        options={targetOptions}
        onChange={(v) => onChange({ ...value, target: v as RuleTarget })}
        disabled={disabled}
      />

      <Dropdown
        label="Discount type"
        value={value.discount_type}
        options={DISCOUNT_TYPE_OPTIONS}
        onChange={(v) => onChange({ ...value, discount_type: v as PricingDiscountType })}
        disabled={disabled}
      />

      {value.discount_type === 'percent' && (
        <Input
          id={`${fieldId}-percentage`}
          type="number"
          label="Percentage (%)"
          value={value.percent}
          onChange={(e) => onChange({ ...value, percent: e.target.value })}
          min={0}
          max={100}
          step={0.01}
          disabled={disabled}
        />
      )}

      {value.discount_type === 'price_override' && (
        <Input
          id={`${fieldId}-custom-price`}
          type="number"
          label="Custom price ($)"
          value={value.price}
          onChange={(e) => onChange({ ...value, price: e.target.value })}
          min={0}
          step={0.01}
          disabled={disabled}
        />
      )}
    </>
  );
}
