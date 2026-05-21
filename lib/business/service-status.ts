import type { BusinessDetail } from '@/lib/api/business';

export type ServiceId = 'website' | 'dns' | 'email' | 'domain';

export type ServiceState =
  | 'not_started'
  | 'in_progress'
  | 'needs_input'
  | 'failed'
  | 'live'
  | 'not_applicable';

export interface ServiceTileData {
  service: ServiceId;
  title: string;
  state: ServiceState;
  progressLabel: string | null;
  phase: string | null;
  updatedAt: string | null;
}

const SERVICE_ORDER: ServiceId[] = ['website', 'dns', 'email', 'domain'];

const TITLES: Record<ServiceId, string> = {
  website: 'Your site',
  dns: 'DNS',
  email: 'Email',
  domain: 'Domain',
};

const VALID_STATES: ReadonlyArray<ServiceState> = [
  'not_started',
  'in_progress',
  'needs_input',
  'failed',
  'live',
  'not_applicable',
];

function coerceState(s: string): ServiceState {
  return (VALID_STATES as ReadonlyArray<string>).includes(s) ? (s as ServiceState) : 'not_started';
}

export function normalizeProvisioning(
  rows: BusinessDetail['provisioning'],
): ServiceTileData[] {
  const byService = new Map<string, BusinessDetail['provisioning'][number]>();
  for (const row of rows) byService.set(row.service, row);

  return SERVICE_ORDER.map((service) => {
    const row = byService.get(service);
    if (!row) {
      return {
        service,
        title: TITLES[service],
        state: 'not_started',
        progressLabel: null,
        phase: null,
        updatedAt: null,
      };
    }
    const rawPhase = (row.metadata as Record<string, unknown> | null)?.phase;
    const phase = typeof rawPhase === 'string' ? rawPhase : null;
    return {
      service,
      title: TITLES[service],
      state: coerceState(row.state),
      progressLabel: row.progress_label,
      phase,
      updatedAt: row.updated_at,
    };
  });
}

export function shouldPoll(detail: BusinessDetail | null): boolean {
  if (!detail) return false;
  const tiles = normalizeProvisioning(detail.provisioning);
  if (tiles.some((t) => t.state === 'in_progress')) return true;
  const allNotStarted = tiles.every((t) => t.state === 'not_started');
  return allNotStarted;
}

export function summaryHeadline(tiles: ServiceTileData[]): string {
  if (tiles.length > 0 && tiles.every((t) => t.state === 'live')) {
    return 'Your business is live.';
  }
  if (tiles.some((t) => t.state === 'failed')) {
    return 'We hit a snag — our team is on it.';
  }
  const website = tiles.find((t) => t.service === 'website');
  if (website?.state === 'live') return 'Your site is live. Finishing up the rest.';
  return 'Setting up your business…';
}
