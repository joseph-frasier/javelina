'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';
import { useToastStore } from '@/lib/stores/toast-store';
import {
  pricingApi,
  type CreatePricingRuleInput,
  type PricingCategory,
  type PricingDiscountType,
} from '@/lib/api-client';

type Target = 'all' | PricingCategory;

interface Props {
  isOpen: boolean;
  orgId: string;
  /** An all-products baseline rule is already active for this org. */
  hasBaseline?: boolean;
  /** At least one product-specific rule is already active for this org. */
  hasCategoryRules?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const TARGET_OPTIONS: { value: Target; label: string }[] = [
  { value: 'all', label: 'All products (baseline)' },
  { value: 'plan', label: 'Plan' },
  { value: 'mailbox', label: 'Mailboxes' },
  { value: 'domain', label: 'Domains' },
];

const DISCOUNT_TYPE_OPTIONS: { value: PricingDiscountType; label: string }[] = [
  { value: 'percent', label: 'Percentage off' },
  { value: 'waive', label: 'Waive (100% off)' },
  { value: 'price_override', label: 'Price override' },
];

export default function SetPricingRuleModal({
  isOpen,
  orgId,
  hasBaseline = false,
  hasCategoryRules = false,
  onClose,
  onSaved,
}: Props) {
  const addToast = useToastStore((s) => s.addToast);

  // An all-products rule and product-specific rules are mutually exclusive.
  // Keep every target visible but gray out the ones that would conflict, with
  // a hover reason — so the constraint is discoverable, not hidden. The backend
  // also rejects a conflicting rule with 409 as the source of truth.
  const targetOptions = useMemo(
    () =>
      TARGET_OPTIONS.map((o) => {
        const disabled =
          (hasBaseline && o.value !== 'all') || (hasCategoryRules && o.value === 'all');
        return {
          ...o,
          disabled,
          title: disabled
            ? o.value === 'all'
              ? 'Archive the product-specific rule(s) first'
              : 'Archive the all-products rule first'
            : undefined,
        };
      }),
    [hasBaseline, hasCategoryRules],
  );
  const defaultTarget = (targetOptions.find((o) => !o.disabled) ?? targetOptions[0]).value;

  const [target, setTarget] = useState<Target>(defaultTarget);
  const [discountType, setDiscountType] = useState<PricingDiscountType>('percent');
  const [value, setValue] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveUntil, setEffectiveUntil] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Re-seed the target each time the modal opens — the valid options may have
  // changed as rules were added/archived while it was closed.
  useEffect(() => {
    if (isOpen) setTarget(defaultTarget);
  }, [isOpen, defaultTarget]);

  const reset = () => {
    setTarget(defaultTarget);
    setDiscountType('percent');
    setValue('');
    setEffectiveFrom('');
    setEffectiveUntil('');
    setNote('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const input: CreatePricingRuleInput = {
      scope: target === 'all' ? 'all' : 'category',
      category: target === 'all' ? null : target,
      discount_type: discountType,
      value_bps: discountType === 'percent' ? Math.round(parseFloat(value) * 100) : null,
      value_cents: discountType === 'price_override' ? Math.round(parseFloat(value) * 100) : null,
      effective_from: effectiveFrom ? new Date(effectiveFrom).toISOString() : undefined,
      effective_until: effectiveUntil ? new Date(effectiveUntil).toISOString() : null,
      note: note.trim() || null,
    };

    if (discountType === 'percent' && (!input.value_bps || input.value_bps < 1 || input.value_bps > 10000)) {
      addToast('error', 'Enter a percentage between 0.01 and 100');
      return;
    }
    if (discountType === 'price_override' && (input.value_cents == null || input.value_cents < 0)) {
      addToast('error', 'Enter a valid custom price');
      return;
    }

    try {
      setSaving(true);
      await pricingApi.create(orgId, input);
      addToast('success', 'Pricing rule saved');
      close();
      onSaved();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save pricing rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Set pricing rule"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Dropdown
          label="Applies to"
          value={target}
          options={targetOptions}
          onChange={(v) => setTarget(v as Target)}
          disabled={saving}
        />

        {(hasBaseline || hasCategoryRules) && (
          <p className="text-xs text-gray-slate">
            {hasBaseline
              ? 'Archive the all-products rule to set product-specific pricing.'
              : 'Archive product-specific rules to set an all-products baseline.'}
          </p>
        )}

        <Dropdown
          label="Discount type"
          value={discountType}
          options={DISCOUNT_TYPE_OPTIONS}
          onChange={(v) => setDiscountType(v as PricingDiscountType)}
          disabled={saving}
        />

        {discountType === 'percent' && (
          <Input
            id="pricing-rule-percentage"
            type="number"
            label="Percentage (%)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            min={0}
            max={100}
            step={0.01}
            disabled={saving}
          />
        )}

        {discountType === 'price_override' && (
          <Input
            id="pricing-rule-custom-price"
            type="number"
            label="Custom price ($)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            min={0}
            step={0.01}
            disabled={saving}
          />
        )}

        <Input
          id="pricing-rule-effective-from"
          type="datetime-local"
          label="Effective from (optional)"
          value={effectiveFrom}
          onChange={(e) => setEffectiveFrom(e.target.value)}
          disabled={saving}
        />

        <Input
          id="pricing-rule-effective-until"
          type="datetime-local"
          label="Effective until (optional)"
          value={effectiveUntil}
          onChange={(e) => setEffectiveUntil(e.target.value)}
          disabled={saving}
        />

        <Input
          id="pricing-rule-note"
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={saving}
        />
      </div>
    </Modal>
  );
}
