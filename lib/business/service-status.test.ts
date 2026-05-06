import { describe, it, expect } from 'vitest';
import type { BusinessDetail } from '@/lib/api/business';
import {
  normalizeProvisioning,
  shouldPoll,
  summaryHeadline,
  type ServiceTileData,
} from './service-status';

function makeDetail(
  provisioning: BusinessDetail['provisioning']
): BusinessDetail {
  return {
    org: { id: 'o1', name: 'Acme', slug: 'acme', status: 'active', created_at: '2026-05-06T00:00:00Z' },
    intake: null,
    provisioning,
    events: [],
  };
}

describe('normalizeProvisioning', () => {
  it('returns 4 tiles in canonical order, defaulting missing services to not_started', () => {
    const tiles = normalizeProvisioning([]);
    expect(tiles.map((t) => t.service)).toEqual(['website', 'dns', 'email', 'domain']);
    expect(tiles.every((t) => t.state === 'not_started')).toBe(true);
    expect(tiles.every((t) => t.progressLabel === null)).toBe(true);
    expect(tiles.every((t) => t.phase === null)).toBe(true);
  });

  it('passes through known states verbatim', () => {
    const tiles = normalizeProvisioning([
      {
        service: 'website',
        state: 'in_progress',
        internal_state: null,
        progress_label: 'Generated page-by-page copy for your site',
        metadata: { phase: 'content' },
        updated_at: '2026-05-06T12:00:00Z',
      },
    ]);
    const website = tiles.find((t) => t.service === 'website')!;
    expect(website.state).toBe('in_progress');
    expect(website.progressLabel).toBe('Generated page-by-page copy for your site');
    expect(website.phase).toBe('content');
    expect(website.updatedAt).toBe('2026-05-06T12:00:00Z');
  });

  it('coerces unknown state strings to not_started', () => {
    const tiles = normalizeProvisioning([
      {
        service: 'dns',
        state: 'something_weird',
        internal_state: null,
        progress_label: null,
        metadata: {},
        updated_at: '2026-05-06T12:00:00Z',
      },
    ]);
    expect(tiles.find((t) => t.service === 'dns')!.state).toBe('not_started');
  });

  it('handles non-string phase metadata as null', () => {
    const tiles = normalizeProvisioning([
      {
        service: 'website',
        state: 'in_progress',
        internal_state: null,
        progress_label: null,
        metadata: { phase: 42 as unknown as string },
        updated_at: '2026-05-06T12:00:00Z',
      },
    ]);
    expect(tiles.find((t) => t.service === 'website')!.phase).toBeNull();
  });

  it('preserves all six canonical states', () => {
    const states = ['not_started', 'in_progress', 'needs_input', 'failed', 'live', 'not_applicable'] as const;
    for (const state of states) {
      const tiles = normalizeProvisioning([
        { service: 'email', state, internal_state: null, progress_label: null, metadata: {}, updated_at: '2026-05-06T12:00:00Z' },
      ]);
      expect(tiles.find((t) => t.service === 'email')!.state).toBe(state);
    }
  });
});

describe('shouldPoll', () => {
  it('returns false for null detail', () => {
    expect(shouldPoll(null)).toBe(false);
  });

  it('returns true when any tile is in_progress', () => {
    const detail = makeDetail([
      { service: 'website', state: 'in_progress', internal_state: null, progress_label: null, metadata: {}, updated_at: '2026-05-06T00:00:00Z' },
    ]);
    expect(shouldPoll(detail)).toBe(true);
  });

  it('returns true when all tiles are not_started (pre-emit window)', () => {
    expect(shouldPoll(makeDetail([]))).toBe(true);
  });

  it('returns false when website is live and others terminal', () => {
    const detail = makeDetail([
      { service: 'website', state: 'live', internal_state: null, progress_label: null, metadata: {}, updated_at: '2026-05-06T00:00:00Z' },
      { service: 'dns', state: 'live', internal_state: null, progress_label: null, metadata: {}, updated_at: '2026-05-06T00:00:00Z' },
      { service: 'email', state: 'needs_input', internal_state: null, progress_label: null, metadata: {}, updated_at: '2026-05-06T00:00:00Z' },
      { service: 'domain', state: 'live', internal_state: null, progress_label: null, metadata: {}, updated_at: '2026-05-06T00:00:00Z' },
    ]);
    expect(shouldPoll(detail)).toBe(false);
  });

  it('returns false when any tile is failed and none in_progress', () => {
    const detail = makeDetail([
      { service: 'website', state: 'failed', internal_state: null, progress_label: null, metadata: {}, updated_at: '2026-05-06T00:00:00Z' },
    ]);
    expect(shouldPoll(detail)).toBe(false);
  });
});

describe('summaryHeadline', () => {
  function tilesWith(overrides: Partial<Record<ServiceTileData['service'], ServiceTileData['state']>>): ServiceTileData[] {
    const base: ServiceTileData['service'][] = ['website', 'dns', 'email', 'domain'];
    return base.map((s) => ({
      service: s,
      title: s,
      state: overrides[s] ?? 'not_started',
      progressLabel: null,
      phase: null,
      updatedAt: null,
    }));
  }

  it('all live → business is live', () => {
    expect(summaryHeadline(tilesWith({ website: 'live', dns: 'live', email: 'live', domain: 'live' })))
      .toBe('Your business is live.');
  });

  it('any failed → snag copy', () => {
    expect(summaryHeadline(tilesWith({ website: 'in_progress', dns: 'failed' })))
      .toBe('We hit a snag — our team is on it.');
  });

  it('website live but others working → finishing up copy', () => {
    expect(summaryHeadline(tilesWith({ website: 'live', dns: 'in_progress' })))
      .toBe('Your site is live. Finishing up the rest.');
  });

  it('default → setting up copy', () => {
    expect(summaryHeadline(tilesWith({}))).toBe('Setting up your business…');
  });
});
