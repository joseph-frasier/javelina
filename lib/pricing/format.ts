import type { PricingRule, PricingCategory } from '@/lib/api-client';

export function categoryLabel(category: PricingCategory | null): string {
  switch (category) {
    case null: return 'All products';
    case 'plan': return 'Plan';
    case 'mailbox': return 'Mailboxes';
    case 'domain': return 'Domains';
  }
}

export function formatRule(rule: PricingRule): string {
  switch (rule.discount_type) {
    case 'percent': {
      const pct = (rule.value_bps ?? 0) / 100;
      // Trim a trailing ".0" (15.0 -> "15"), keep "40.5".
      return `${Number.isInteger(pct) ? pct : Number(pct.toFixed(2))}% off`;
    }
    case 'waive': return 'Waived (100% off)';
    case 'price_override': return `$${((rule.value_cents ?? 0) / 100).toFixed(2)} flat`;
  }
}

export type RuleStatus = 'in_effect' | 'scheduled' | 'expired' | 'archived';

/**
 * Where a rule sits relative to now. The backend's "active" list means
 * `archived_at is null` — not "in effect right now" — so scheduled and expired
 * rules arrive in it and must not be presented as live. Boundaries match the
 * backend resolver: start inclusive, end exclusive.
 */
export function ruleStatus(rule: PricingRule, at: Date = new Date()): RuleStatus {
  if (rule.archived_at !== null) return 'archived';
  if (new Date(rule.effective_from) > at) return 'scheduled';
  if (rule.effective_until !== null && new Date(rule.effective_until) <= at) return 'expired';
  return 'in_effect';
}

export function isRuleActive(rule: PricingRule, at: Date = new Date()): boolean {
  if (rule.archived_at !== null) return false;
  if (new Date(rule.effective_from) > at) return false;
  if (rule.effective_until !== null && new Date(rule.effective_until) <= at) return false;
  return true;
}

export function activeRules(rules: PricingRule[], at: Date = new Date()): PricingRule[] {
  return rules.filter((r) => isRuleActive(r, at));
}

export function hasActivePricing(rules: PricingRule[], at: Date = new Date()): boolean {
  return activeRules(rules, at).length > 0;
}
