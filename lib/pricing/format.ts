import type { PricingRule, PricingCategory } from '@/lib/api-client';

export function categoryLabel(category: PricingCategory | null): string {
  switch (category) {
    case null: return 'All products';
    case 'plan': return 'Plan';
    case 'mailbox': return 'Mailboxes';
    case 'domain': return 'Domains';
  }
}

/**
 * A rule this function can format, discriminated on `discount_type` so each
 * variant requires the field it actually needs.
 *
 * This was previously
 * `Pick<PricingRule,'discount_type'> & Partial<Pick<PricingRule,'value_bps'|'value_cents'>>`,
 * widened so DiscountCodeRuleInput would fit. That let a percent rule missing
 * its value_bps format as "0% off" — a wrong number rendered inside a green
 * success box — instead of failing where the value went missing. The nullable
 * fields stay nullable (the DB column is), but a percent rule can no longer
 * omit value_bps entirely.
 */
export type FormattableRule =
  | { discount_type: 'percent'; value_bps: number | null; value_cents?: number | null }
  | { discount_type: 'waive'; value_bps?: number | null; value_cents?: number | null }
  | { discount_type: 'price_override'; value_cents: number | null; value_bps?: number | null };

/**
 * Narrow a loosely-typed rule (e.g. DiscountCodeRuleInput, whose value fields
 * are optional) to something formatRule will accept, or null when the value the
 * type requires is absent.
 *
 * Returning null rather than defaulting to zero is the point: a percent rule
 * with no value_bps used to format as "0% off" and render that inside a green
 * success box. A caller that gets null can say "discount" instead of stating a
 * number it does not have.
 */
export function toFormattableRule(rule: {
  discount_type: PricingRule['discount_type'];
  value_bps?: number | null;
  value_cents?: number | null;
}): FormattableRule | null {
  switch (rule.discount_type) {
    case 'percent':
      return rule.value_bps == null
        ? null
        : { discount_type: 'percent', value_bps: rule.value_bps };
    case 'waive':
      return { discount_type: 'waive' };
    case 'price_override':
      return rule.value_cents == null
        ? null
        : { discount_type: 'price_override', value_cents: rule.value_cents };
    default:
      return null;
  }
}

export function formatRule(rule: FormattableRule): string {
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
