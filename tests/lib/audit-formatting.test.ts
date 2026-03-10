import { describe, expect, it } from 'vitest';
import { isSystemOnlyChange } from '@/lib/utils/audit-formatting';

describe('isSystemOnlyChange', () => {
  it('returns true for zones updates with only last_valid_serial and updated_at changes', () => {
    const oldData = {
      id: 'zone-1',
      name: 'example.com',
      last_valid_serial: 16,
      updated_at: '2026-03-05T10:00:00.000Z',
    };

    const newData = {
      id: 'zone-1',
      name: 'example.com',
      last_valid_serial: 17,
      updated_at: '2026-03-05T10:01:00.000Z',
    };

    expect(isSystemOnlyChange(oldData, newData, 'zones')).toBe(true);
  });

  it('returns true for zones updates with only soa_serial and updated_at changes', () => {
    const oldData = {
      id: 'zone-1',
      name: 'example.com',
      soa_serial: 20,
      updated_at: '2026-03-05T10:00:00.000Z',
    };

    const newData = {
      id: 'zone-1',
      name: 'example.com',
      soa_serial: 21,
      updated_at: '2026-03-05T10:01:00.000Z',
    };

    expect(isSystemOnlyChange(oldData, newData, 'zones')).toBe(true);
  });

  it('returns false when a meaningful zones field also changes', () => {
    const oldData = {
      id: 'zone-1',
      name: 'example.com',
      soa_serial: 20,
      updated_at: '2026-03-05T10:00:00.000Z',
    };

    const newData = {
      id: 'zone-1',
      name: 'example.net',
      soa_serial: 21,
      updated_at: '2026-03-05T10:01:00.000Z',
    };

    expect(isSystemOnlyChange(oldData, newData, 'zones')).toBe(false);
  });

  it('returns false for zone_records updates', () => {
    const oldData = {
      id: 'record-1',
      name: '@',
      value: '192.0.2.10',
      updated_at: '2026-03-05T10:00:00.000Z',
    };

    const newData = {
      id: 'record-1',
      name: '@',
      value: '192.0.2.11',
      updated_at: '2026-03-05T10:01:00.000Z',
    };

    expect(isSystemOnlyChange(oldData, newData, 'zone_records')).toBe(false);
  });
});
