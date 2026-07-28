// Filters a base list of selectable year counts by the per-org ceiling.
// maxYears === 1 while a discount rule is active, blocking multi-year buys.
export function domainYearOptions(base: number[], maxYears?: number): number[] {
  if (maxYears == null) return base;
  return base.filter((y) => y <= maxYears);
}
