import { BRANDS, DEFAULT_BRAND, type BrandConfig, type BrandId } from './config';

/**
 * Map a request Host header to a brand.
 *
 * Never throws, and never guesses: matching is exact on the hostname (port
 * ignored), so an unrecognised host — a preview deployment, a misconfigured
 * alias, an attacker-supplied Host — resolves to Javelina rather than
 * borrowing another brand's identity.
 */
export function resolveBrandFromHost(host: string | null | undefined): BrandConfig {
  if (!host) return DEFAULT_BRAND;

  const hostname = host.trim().toLowerCase().split(':')[0];
  if (!hostname) return DEFAULT_BRAND;

  for (const brand of Object.values(BRANDS)) {
    for (const candidate of brand.hostnames) {
      if (hostname === candidate.toLowerCase().split(':')[0]) return brand;
    }
  }

  return DEFAULT_BRAND;
}

/** Map a brand id (e.g. from the x-brand header) to a brand. Never throws. */
export function resolveBrandById(id: string | null | undefined): BrandConfig {
  if (id && Object.prototype.hasOwnProperty.call(BRANDS, id)) {
    return BRANDS[id as BrandId];
  }
  return DEFAULT_BRAND;
}
