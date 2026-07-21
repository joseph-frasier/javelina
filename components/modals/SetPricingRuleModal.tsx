'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
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

export default function SetPricingRuleModal({ isOpen, orgId, onClose, onSaved }: Props) {
  const addToast = useToastStore((s) => s.addToast);
  const [target, setTarget] = useState<Target>('all');
  const [discountType, setDiscountType] = useState<PricingDiscountType>('percent');
  const [value, setValue] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveUntil, setEffectiveUntil] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTarget('all');
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
        <div>
          <label htmlFor="pricing-rule-target" className="block text-sm font-medium text-text mb-1.5">
            Applies to
          </label>
          <select
            id="pricing-rule-target"
            value={target}
            onChange={(e) => setTarget(e.target.value as Target)}
            className="w-full h-10 px-3 rounded-md border border-border bg-surface text-text text-sm focus-visible:outline-none focus-visible:shadow-focus-ring hover:border-border-strong"
          >
            {TARGET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="pricing-rule-discount-type" className="block text-sm font-medium text-text mb-1.5">
            Discount type
          </label>
          <select
            id="pricing-rule-discount-type"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as PricingDiscountType)}
            className="w-full h-10 px-3 rounded-md border border-border bg-surface text-text text-sm focus-visible:outline-none focus-visible:shadow-focus-ring hover:border-border-strong"
          >
            {DISCOUNT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

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
