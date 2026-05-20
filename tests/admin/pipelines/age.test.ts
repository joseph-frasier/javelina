import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatAge } from '@/app/admin/pipelines/_lib/age';

describe('formatAge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns minutes when under 1 hour', () => {
    expect(formatAge('2026-05-06T11:15:00Z')).toBe('45m');
  });

  it('returns hours-only when under 1 day', () => {
    expect(formatAge('2026-05-06T09:00:00Z')).toBe('3h');
  });

  it('returns days + hours when over 1 day', () => {
    expect(formatAge('2026-05-04T08:00:00Z')).toBe('2d 4h');
  });

  it('returns "0m" for future or now', () => {
    expect(formatAge('2026-05-06T12:00:00Z')).toBe('0m');
    expect(formatAge('2026-05-07T00:00:00Z')).toBe('0m');
  });
});
