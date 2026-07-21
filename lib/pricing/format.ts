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
