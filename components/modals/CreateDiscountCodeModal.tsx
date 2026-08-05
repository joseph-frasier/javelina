'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';
import { useToastStore } from '@/lib/stores/toast-store';
import { discountsApi, type CreateDiscountCodeInput } from '@/lib/api-client';
import PricingRuleFields, {
  emptyRuleDraft,
  draftToRuleInput,
  type RuleDraft,
  type RuleTarget,
} from '@/components/admin/PricingRuleFields';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type DurationMode = 'months' | 'date' | 'open';

function usedTargets(drafts: RuleDraft[], skipIndex: number): RuleTarget[] {
  return drafts.filter((_, i) => i !== skipIndex).map((d) => d.target);
}

export default function CreateDiscountCodeModal({ isOpen, onClose, onCreated }: Props) {
  const addToast = useToastStore((s) => s.addToast);

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [customerBlurb, setCustomerBlurb] = useState('');
  const [durationMode, setDurationMode] = useState<DurationMode>('months');
  const [durationMonths, setDurationMonths] = useState('');
  const [grantEndsAt, setGrantEndsAt] = useState('');
  const [redeemableUntil, setRedeemableUntil] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [drafts, setDrafts] = useState<RuleDraft[]>([emptyRuleDraft()]);
  const [confirmText, setConfirmText] = useState('');
  const [saving, setSaving] = useState(false);

  // An all-products rule and product-specific rules are mutually exclusive —
  // once any draft targets 'all', a second rule can't be added at all, and
  // vice versa the 'all' option is disabled once a category rule exists.
  const hasAllRule = drafts.some((d) => d.target === 'all');
  const hasCategoryRule = drafts.some((d) => d.target !== 'all');
  const canAddRule = !hasAllRule;

  const reset = () => {
    setCode('');
    setDescription('');
    setCustomerBlurb('');
    setDurationMode('months');
    setDurationMonths('');
    setGrantEndsAt('');
    setRedeemableUntil('');
    setMaxRedemptions('');
    setDrafts([emptyRuleDraft()]);
    setConfirmText('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const addRule = () => {
    if (!canAddRule) return;
    setDrafts((prev) => [...prev, emptyRuleDraft()]);
  };

  const removeRule = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, next: RuleDraft) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? next : d)));
  };

  // Grants everything for free — require typing the code to confirm this is
  // intentional rather than a slip of the target/discount-type dropdowns.
  const isGiveaway = drafts.some((d) => d.target === 'all' && d.discount_type === 'waive');
  const giveawayConfirmed = !isGiveaway || confirmText.trim().toUpperCase() === code.trim().toUpperCase();

  const handleSubmit = async () => {
    if (!code.trim()) {
      addToast('error', 'Enter a code');
      return;
    }

    // draftToRuleInput() throws on a non-numeric percent/price, so pre-validate
    // every draft here rather than letting that escape as an unhandled crash.
    for (const draft of drafts) {
      const needsValue = draft.discount_type === 'percent' || draft.discount_type === 'price_override';
      const rawValue = draft.discount_type === 'percent' ? draft.percent : draft.price;
      if (needsValue && !Number.isFinite(Number.parseFloat(rawValue))) {
        addToast(
          'error',
          draft.discount_type === 'percent' ? 'Enter a percentage for every rule' : 'Enter a custom price for every rule',
        );
        return;
      }
    }

    const hasPriceOverride = drafts.some((d) => d.discount_type === 'price_override');
    if (hasPriceOverride && !maxRedemptions.trim()) {
      addToast('error', 'A price override requires a redemption limit.');
      return;
    }

    if (isGiveaway && !giveawayConfirmed) {
      addToast('error', `Type "${code.trim()}" to confirm this gives everything away for free.`);
      return;
    }

    let ruleInputs;
    try {
      ruleInputs = drafts.map(draftToRuleInput);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Invalid rule');
      return;
    }

    const input: CreateDiscountCodeInput = {
      code: code.trim().toUpperCase(),
      description: description.trim() || null,
      customer_blurb: customerBlurb.trim() || null,
      duration_months: durationMode === 'months' && durationMonths ? Number.parseInt(durationMonths, 10) : null,
      grant_ends_at: durationMode === 'date' && grantEndsAt ? new Date(grantEndsAt).toISOString() : null,
      redeemable_until: redeemableUntil ? new Date(redeemableUntil).toISOString() : null,
      max_redemptions: maxRedemptions.trim() ? Number.parseInt(maxRedemptions, 10) : null,
      rules: ruleInputs,
    };

    try {
      setSaving(true);
      await discountsApi.create(input);
      addToast('success', 'Discount code created');
      close();
      onCreated();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to create discount code');
    } finally {
      setSaving(false);
    }
  };

  const durationOptions = useMemo(
    () => [
      { value: 'months', label: 'Relative — N months from redemption' },
      { value: 'date', label: 'Absolute — ends on a fixed date' },
      { value: 'open', label: 'Open-ended — no expiration' },
    ],
    [],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Create discount code"
      size="large"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creating…' : 'Create code'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <Input
            id="discount-code-code"
            label="Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. LAUNCH25"
            disabled={saving}
          />
          <Input
            id="discount-code-description"
            label="Internal description (optional)"
            helperText="Staff-only notes — never shown to customers."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />
          <Input
            id="discount-code-blurb"
            label="Customer-facing blurb (optional)"
            helperText="Shown to the customer when they redeem the code."
            value={customerBlurb}
            onChange={(e) => setCustomerBlurb(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <h4 className="text-sm font-bold text-text">What this code grants</h4>
          {drafts.map((draft, index) => (
            <div key={index} className="space-y-3">
              {index > 0 && <div className="border-t border-border pt-3" />}
              <PricingRuleFields
                value={draft}
                onChange={(next) => updateRule(index, next)}
                disabledTargets={
                  hasAllRule && draft.target !== 'all'
                    ? []
                    : [
                        ...(hasCategoryRule ? (['all'] as RuleTarget[]) : []),
                        ...usedTargets(drafts, index).filter((t) => t !== 'all'),
                      ]
                }
                disabledReason="An all-products rule cannot be combined with product-specific rules."
                disabled={saving}
              />
              {drafts.length > 1 && (
                <Button variant="outline" size="sm" onClick={() => removeRule(index)} disabled={saving}>
                  Remove rule
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={addRule}
            disabled={saving || !canAddRule}
            title={!canAddRule ? 'An all-products rule cannot be combined with product-specific rules.' : undefined}
          >
            Add another product rule
          </Button>
        </div>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <h4 className="text-sm font-bold text-text">Grant duration</h4>
          <p className="text-xs text-gray-slate">How long each redeemer&rsquo;s discount lasts, once redeemed.</p>
          <Dropdown
            label="Duration type"
            value={durationMode}
            options={durationOptions}
            onChange={(v) => setDurationMode(v as DurationMode)}
            disabled={saving}
          />
          {durationMode === 'months' && (
            <Input
              id="discount-code-duration-months"
              type="number"
              label="Months"
              min={1}
              value={durationMonths}
              onChange={(e) => setDurationMonths(e.target.value)}
              disabled={saving}
            />
          )}
          {durationMode === 'date' && (
            <Input
              id="discount-code-grant-ends"
              type="datetime-local"
              label="Grant ends at"
              value={grantEndsAt}
              onChange={(e) => setGrantEndsAt(e.target.value)}
              disabled={saving}
            />
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <h4 className="text-sm font-bold text-text">Code availability</h4>
          <p className="text-xs text-gray-slate">When the code itself stops working, independent of grant duration.</p>
          <Input
            id="discount-code-redeemable-until"
            type="datetime-local"
            label="Redeemable until (optional)"
            helperText="Leave blank for no expiration on the code itself."
            value={redeemableUntil}
            onChange={(e) => setRedeemableUntil(e.target.value)}
            disabled={saving}
          />
          <Input
            id="discount-code-max-redemptions"
            type="number"
            label="Max redemptions (optional)"
            min={1}
            helperText="Leave blank for unlimited redemptions."
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
            error={
              drafts.some((d) => d.discount_type === 'price_override') && !maxRedemptions.trim()
                ? 'A price override requires a redemption limit.'
                : undefined
            }
            disabled={saving}
          />
        </div>

        {isGiveaway && (
          <div className="space-y-2 rounded-lg border border-danger/40 bg-danger-soft p-4">
            <p className="text-sm text-danger">
              This code waives 100% of all products for every redeemer &mdash; it grants everything for
              free. Type the code below to confirm.
            </p>
            <Input
              id="discount-code-giveaway-confirm"
              label={`Type "${code.trim() || '…'}" to confirm`}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={saving}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
