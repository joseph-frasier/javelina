import type { PricingRule, PricingCategory, PricingDiscountType } from '@/lib/api-client';

/**
 * The cents arithmetic behind what a customer is told they will pay.
 *
 * Extracted from app/checkout/page.tsx so it can be tested. It previously lived
 * inline in an 800-line page component and was unexported, so the numbers that
 * decide a customer's quoted total had no tests while the string formatters
 * next door had sixteen.
 *
 * Everything here is integer cents in, integer cents out. Conversion to a
 * display value happens once, at the render site.
 */

export type DiscountRuleForMath = Pick<
  PricingRule,
  'scope' | 'category' | 'discount_type' | 'value_bps' | 'value_cents'
>;

/**
 * A code's rules can include a plan/all-scoped grant (changes this invoice's
 * total) alongside domain/mailbox grants (nothing on this invoice for them to
 * discount, so they render as included-benefit copy instead).
 */
export function isPlanOrAllRule(rule: {
  scope: 'all' | 'category';
  category: PricingCategory | null;
}): boolean {
  return rule.scope === 'all' || (rule.scope === 'category' && rule.category === 'plan');
}

/** Apply a single rule to a cents amount. Cents in, cents out — never floats. */
export function priceAfterRule(
  rule: {
    discount_type: PricingDiscountType;
    value_bps: number | null;
    value_cents: number | null;
  },
  originalCents: number,
): number {
  switch (rule.discount_type) {
    case 'percent':
      // Same formula as the backend's amountFor (services/pricing/apply.ts) —
      // subtracting a rounded discount instead diverges by a cent on an exact
      // half-cent, so the preview would not match the invoice.
      return Math.max(0, Math.round((originalCents * (10000 - (rule.value_bps ?? 0))) / 10000));
    case 'waive':
      return 0;
    case 'price_override':
      return Math.max(0, rule.value_cents ?? 0);
  }
}

export interface DiscountedTotal {
  /** The pre-discount amount, unchanged. */
  originalCents: number;
  /** What the customer pays after the plan-affecting rule, if any. */
  discountedCents: number;
  /** originalCents - discountedCents. Never negative. */
  discountAmountCents: number;
  /** The one rule that moved the total, or null when none applies. */
  planDiscountRule: DiscountRuleForMath | null;
  /** Rules that grant something this invoice cannot discount (domain/mailbox). */
  includedBenefitRules: DiscountRuleForMath[];
}

/**
 * Split a code's rules into the one that changes this invoice and the ones that
 * are benefits described alongside it, and compute the resulting total.
 *
 * Only the first plan/all-scoped rule applies: a code carries at most one such
 * rule (validateTemplate rejects a second baseline, and an all-scoped rule
 * cannot be combined with category rules), so `find` is not an arbitrary pick.
 */
export function computeDiscountedTotal(
  originalCents: number,
  rules: DiscountRuleForMath[] | null | undefined,
): DiscountedTotal {
  const planDiscountRule = rules?.find(isPlanOrAllRule) ?? null;
  const includedBenefitRules = rules?.filter((rule) => !isPlanOrAllRule(rule)) ?? [];
  const discountedCents = planDiscountRule
    ? priceAfterRule(planDiscountRule, originalCents)
    : originalCents;

  return {
    originalCents,
    discountedCents,
    discountAmountCents: originalCents - discountedCents,
    planDiscountRule,
    includedBenefitRules,
  };
}
