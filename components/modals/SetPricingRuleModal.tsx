'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useToastStore } from '@/lib/stores/toast-store';
import { pricingApi, type CreatePricingRuleInput } from '@/lib/api-client';
import PricingRuleFields, {
  emptyRuleDraft,
  draftToRuleInput,
  TARGET_OPTIONS,
  type RuleDraft,
  type RuleTarget,
} from '@/components/admin/PricingRuleFields';

interface Props {
  isOpen: boolean;
  orgId: string;
  /** An all-products baseline rule is already active for this org. */
  hasBaseline?: boolean;
  /** At least one product-specific rule is already active for this org. */
  hasCategoryRules?: boolean;
  /** Targets that already have an active rule — saving over one replaces it. */
  activeTargets?: RuleTarget[];
  onClose: () => void;
  onSaved: () => void;
}

export default function SetPricingRuleModal({
  isOpen,
  orgId,
  hasBaseline = false,
  hasCategoryRules = false,
  activeTargets = [],
  onClose,
  onSaved,
}: Props) {
  const addToast = useToastStore((s) => s.addToast);

  const disabledTargets = useMemo<RuleTarget[]>(
    () => (hasBaseline ? ['plan', 'mailbox', 'domain'] : hasCategoryRules ? ['all'] : []),
    [hasBaseline, hasCategoryRules],
  );
  const disabledReason = hasBaseline
    ? 'Archive the all-products rule first'
    : hasCategoryRules
      ? 'Archive the product-specific rule(s) first'
      : undefined;
  const defaultTarget = useMemo<RuleTarget>(() => {
    const first = TARGET_OPTIONS.find((o) => !disabledTargets.includes(o.value));
    return (first ?? TARGET_OPTIONS[0]).value;
  }, [disabledTargets]);

  const [draft, setDraft] = useState<RuleDraft>(() => ({ ...emptyRuleDraft(), target: defaultTarget }));
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveUntil, setEffectiveUntil] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Re-seed the target each time the modal opens — the valid options may have
  // changed as rules were added/archived while it was closed.
  useEffect(() => {
    if (isOpen) setDraft((d) => ({ ...d, target: defaultTarget }));
  }, [isOpen, defaultTarget]);

  // Saving archives the active rule for this target and inserts the new one, so
  // a future start date does NOT keep the current rule running until then — it
  // ends the discount now and leaves a gap. Nothing in the form conveys that,
  // so warn; scheduling is still a legitimate thing to want, so don't block it.
  const replacesActiveRule = activeTargets.includes(draft.target);
  const startsInFuture = effectiveFrom !== '' && new Date(effectiveFrom).getTime() > Date.now();
  const showScheduleWarning = replacesActiveRule && startsInFuture;

  const reset = () => {
    setDraft({ ...emptyRuleDraft(), target: defaultTarget });
    setEffectiveFrom('');
    setEffectiveUntil('');
    setNote('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    // Validate before building the payload. parseFloat('') is NaN, which passes
    // both `== null` and `< 0`, and JSON.stringify serializes it to null — so a
    // blank custom price reached the backend as price_override with no value
    // and came back as a raw API error. (The percent branch was only safe by
    // accident, via `!input.value_bps` catching NaN as falsy.)
    const needsValue = draft.discount_type === 'percent' || draft.discount_type === 'price_override';
    const rawValue = draft.discount_type === 'percent' ? draft.percent : draft.price;
    if (needsValue && !Number.isFinite(Number.parseFloat(rawValue))) {
      addToast(
        'error',
        draft.discount_type === 'percent' ? 'Enter a percentage' : 'Enter a custom price',
      );
      return;
    }

    const input: CreatePricingRuleInput = {
      ...draftToRuleInput(draft),
      effective_from: effectiveFrom ? new Date(effectiveFrom).toISOString() : undefined,
      effective_until: effectiveUntil ? new Date(effectiveUntil).toISOString() : null,
      note: note.trim() || null,
    };

    if (draft.discount_type === 'percent' && (!input.value_bps || input.value_bps < 1 || input.value_bps > 10000)) {
      addToast('error', 'Enter a percentage between 0.01 and 100');
      return;
    }
    if (draft.discount_type === 'price_override' && (input.value_cents == null || input.value_cents < 0)) {
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
        <PricingRuleFields
          value={draft}
          onChange={setDraft}
          disabledTargets={disabledTargets}
          disabledReason={disabledReason}
          disabled={saving}
        />

        {(hasBaseline || hasCategoryRules) && (
          <p className="text-xs text-gray-slate">
            {hasBaseline
              ? 'Archive the all-products rule to set product-specific pricing.'
              : 'Archive product-specific rules to set an all-products baseline.'}
          </p>
        )}

        <Input
          id="pricing-rule-effective-from"
          type="datetime-local"
          label="Effective from (optional)"
          value={effectiveFrom}
          onChange={(e) => setEffectiveFrom(e.target.value)}
          disabled={saving}
        />

        {showScheduleWarning && (
          <p
            role="alert"
            className="rounded-md border border-orange/40 bg-orange/10 px-3 py-2 text-sm text-orange-dark dark:text-orange-light"
          >
            This replaces the existing{' '}
            {TARGET_OPTIONS.find((o) => o.value === draft.target)?.label.toLowerCase()} rule, and the
            current discount ends immediately when you save — it will not stay active until the
            start date above. Scheduled rule changes are not supported yet.
          </p>
        )}

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
