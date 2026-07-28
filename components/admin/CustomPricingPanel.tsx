'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import Button from '@/components/ui/Button';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import SetPricingRuleModal from '@/components/modals/SetPricingRuleModal';
import { useToastStore } from '@/lib/stores/toast-store';
import { adminApi, pricingApi, type PricingRule } from '@/lib/api-client';
import { formatRule, categoryLabel, ruleStatus } from '@/lib/pricing/format';
import { formatUsdCents } from '@/lib/billing/format';
import type { PlanPricing } from '@/types/billing';

interface Props {
  orgId: string;
  orgName: string;
  onPricingChange?: () => void;
}

function effectiveWindow(rule: PricingRule): string {
  const from = new Date(rule.effective_from).toLocaleDateString();
  const until = rule.effective_until
    ? new Date(rule.effective_until).toLocaleDateString()
    : 'open';
  return `Effective ${from} – ${until}`;
}

function PricingRuleRow({
  rule,
  onArchive,
}: {
  rule: PricingRule;
  onArchive: (rule: PricingRule) => void;
}) {
  const status = ruleStatus(rule);
  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-text">{categoryLabel(rule.category)}</span>
          <AdminStatusBadge variant="accent" label={formatRule(rule)} />
          {/* A rule stays in the active list until archived, so one outside its
              window sits beside live rules with nothing to tell them apart. */}
          {status === 'expired' && <AdminStatusBadge variant="danger" label="Expired" />}
          {status === 'scheduled' && <AdminStatusBadge variant="neutral" label="Scheduled" />}
        </div>
        <p className="text-sm text-gray-slate">
          {effectiveWindow(rule)}
          {rule.note ? ` · ${rule.note}` : ''}
        </p>
      </div>
      <Button variant="danger" size="sm" onClick={() => onArchive(rule)}>
        Archive
      </Button>
    </li>
  );
}

export default function CustomPricingPanel({ orgId, orgName, onPricingChange }: Props) {
  const addToast = useToastStore((s) => s.addToast);
  const [active, setActive] = useState<PricingRule[]>([]);
  const [history, setHistory] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<PricingRule | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [planPricing, setPlanPricing] = useState<PlanPricing | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { active: activeRules, history: historyRules } = await pricingApi.list(orgId);
      setActive(activeRules);
      setHistory(historyRules);
      // Refetched with the rules, not once on mount: this line shows staff the
      // price the customer sees, so it has to move when a rule is added or
      // archived. Non-fatal — a pricing outage must not blank the panel.
      await adminApi.getOrgPlanPricing(orgId)
        .then(setPlanPricing)
        .catch(() => setPlanPricing(null));
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Failed to load pricing rules');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- addToast identity is unstable across renders; only orgId should trigger a refetch
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      setArchiving(true);
      await pricingApi.archive(orgId, archiveTarget.id);
      addToast('success', 'Pricing rule archived');
      setArchiveTarget(null);
      await load();
      onPricingChange?.();
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Failed to archive rule');
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-text">Custom Pricing</h3>
        <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
          Add rule
        </Button>
      </div>

      {planPricing?.active &&
        planPricing.effective_cents != null &&
        planPricing.base_cents != null && (
          <p className="text-sm text-gray-slate">
            Effective plan price:{' '}
            <span className="font-medium text-text">
              {formatUsdCents(planPricing.effective_cents)}
            </span>{' '}
            (catalog {formatUsdCents(planPricing.base_cents)})
          </p>
        )}

      {loading ? (
        <p className="text-gray-slate">Loading&hellip;</p>
      ) : active.length === 0 ? (
        <p className="text-gray-slate">
          No custom pricing &mdash; {orgName} is billed at catalog prices.
        </p>
      ) : (
        <ul className="space-y-3">
          {active.map((rule) => (
            <PricingRuleRow key={rule.id} rule={rule} onArchive={setArchiveTarget} />
          ))}
        </ul>
      )}

      {history.length > 0 && (
        <div>
          <button
            type="button"
            className="text-sm text-blue-electric"
            onClick={() => setShowHistory((v) => !v)}
          >
            {showHistory ? 'Hide' : 'Show'} history ({history.length})
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-1">
              {history.map((rule) => (
                <li key={rule.id} className="text-sm text-gray-slate">
                  {categoryLabel(rule.category)} &middot; {formatRule(rule)} &middot; archived{' '}
                  {rule.archived_at ? new Date(rule.archived_at).toLocaleDateString() : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <SetPricingRuleModal
        isOpen={addOpen}
        orgId={orgId}
        hasBaseline={active.some((r) => r.scope === 'all')}
        hasCategoryRules={active.some((r) => r.scope === 'category')}
        activeTargets={active.map((r) => (r.scope === 'all' ? 'all' : r.category!))}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          void load();
          onPricingChange?.();
        }}
      />

      <ConfirmationModal
        isOpen={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => void handleArchive()}
        title="Archive pricing rule"
        message={`Archive this rule for ${orgName}? Billing returns to the next-most-specific rule (or catalog price) at the next cycle.`}
        variant="danger"
        isLoading={archiving}
      />
    </div>
  );
}
