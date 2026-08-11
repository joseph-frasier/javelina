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

/**
 * The headline for a code the org has already redeemed. Deliberately shared by
 * checkout and billing settings: the two surfaces once carried their own copy
 * of this sentence and drifted, leaving billing to render the rule summary as
 * its headline — visually identical to a fresh grant, so re-entering a spent
 * code read as a second redemption.
 */
export const ALREADY_APPLIED_SUMMARY = 'Already applied to this organization.';

/**
 * The supporting line beneath {@link ALREADY_APPLIED_SUMMARY}.
 *
 * `rules` is every live rule on the org, not necessarily what this code
 * granted — the backend returns an empty list once a superadmin archives the
 * grant. There is nothing concrete to describe in that case, and
 * summarizeRules([]) would put "No discount" inside a success-styled box, so
 * the duration stands alone.
 */
export function alreadyAppliedDetail(
  rules: DiscountCodeRuleInput[],
  code: Pick<DiscountCode, 'duration_months' | 'grant_ends_at'>,
): string {
  const duration = summarizeDuration(code);
  return rules.length > 0 ? `${summarizeRules(rules)} ${duration}` : duration;
}

export function summarizeDuration(
  code: Pick<DiscountCode, 'duration_months' | 'grant_ends_at'>,
): string {
  if (code.duration_months != null) {
    return `for ${code.duration_months} month${code.duration_months === 1 ? '' : 's'}`;
  }
  if (code.grant_ends_at != null) {
    // UTC, not local: grant_ends_at is an instant, and rendering it in the
    // viewer's zone shows two customers different end dates for one grant.
    return `through ${new Date(code.grant_ends_at).toLocaleDateString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })}`;
  }
  return 'ongoing';
}
