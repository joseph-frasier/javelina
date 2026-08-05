import { formatRule, categoryLabel } from '@/lib/pricing/format';
import type { DiscountCode, DiscountCodeRuleInput } from '@/lib/api-client';

/**
 * A one-line description of what a code grants.
 * Reuses the pricing panel's formatters so a rule reads identically wherever
 * it appears — admin list, checkout preview, billing settings.
 */
export function summarizeRules(rules: DiscountCodeRuleInput[]): string {
  if (rules.length === 0) return 'No discount';

  return rules
    .map((rule) => {
      const value = formatRule(rule);
      return rule.scope === 'all'
        ? `${value} ${categoryLabel(rule.category).toLowerCase()}`
        : `${value} on ${categoryLabel(rule.category).toLowerCase()}`;
    })
    .join(', ');
}

export function summarizeDuration(
  code: Pick<DiscountCode, 'duration_months' | 'grant_ends_at'>,
): string {
  if (code.duration_months != null) {
    return `for ${code.duration_months} month${code.duration_months === 1 ? '' : 's'}`;
  }
  if (code.grant_ends_at != null) {
    return `through ${new Date(code.grant_ends_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })}`;
  }
  return 'ongoing';
}
