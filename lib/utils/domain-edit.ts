import type { DomainStatus } from '@/types/domains';

/**
 * Domain statuses in which configuration changes (WHOIS, nameservers,
 * auto-renew, lock) are permitted. Mirrors the backend rule in
 * javelina-backend/src/controllers/domainsController.ts.
 */
export const EDITABLE_DOMAIN_STATUSES: readonly DomainStatus[] = [
  'active',
  'transfer_complete',
];

export function isDomainEditable(status: DomainStatus | string | undefined | null): boolean {
  return !!status && (EDITABLE_DOMAIN_STATUSES as readonly string[]).includes(status);
}
