import { describe, it, expect } from 'vitest';
import {
  effectiveSurfaceMode,
  isSurfaceHidden,
  visibleSurfaces,
  parseSurfaceOverrides,
} from './surfaces';
import { BRANDS } from './config';

const JAVELINA = BRANDS.javelina;
const IRONGROVE = BRANDS.irongrove;

describe('effectiveSurfaceMode', () => {
  it('uses the brand default when there is no override', () => {
    expect(effectiveSurfaceMode(IRONGROVE, 'dns', null)).toBe('hidden');
    expect(effectiveSurfaceMode(IRONGROVE, 'domains', null)).toBe('readonly');
    expect(effectiveSurfaceMode(IRONGROVE, 'website', null)).toBe('full');
    expect(effectiveSurfaceMode(JAVELINA, 'dns', null)).toBe('full');
  });

  it('lets an org override open a surface the brand hides', () => {
    // The escape hatch: a customer who legitimately needs DNS control.
    expect(effectiveSurfaceMode(IRONGROVE, 'dns', { dns: 'full' })).toBe('full');
  });

  it('lets an org override close a surface the brand allows', () => {
    expect(effectiveSurfaceMode(JAVELINA, 'dns', { dns: 'hidden' })).toBe(
      'hidden'
    );
  });

  it('only overrides the named surface, leaving the rest on brand defaults', () => {
    const overrides = { dns: 'full' as const };
    expect(effectiveSurfaceMode(IRONGROVE, 'dns', overrides)).toBe('full');
    expect(effectiveSurfaceMode(IRONGROVE, 'ssl', overrides)).toBe('hidden');
    expect(effectiveSurfaceMode(IRONGROVE, 'domains', overrides)).toBe('readonly');
  });

  it('ignores an override naming an unknown mode rather than failing open', () => {
    // Overrides are hand-written into the DB by support. A typo must not
    // silently grant access.
    const overrides = parseSurfaceOverrides({ dns: 'ful' });
    expect(effectiveSurfaceMode(IRONGROVE, 'dns', overrides)).toBe('hidden');
  });

  it('ignores an override naming an unknown surface', () => {
    const overrides = parseSurfaceOverrides({ nonsense: 'full' });
    expect(effectiveSurfaceMode(IRONGROVE, 'dns', overrides)).toBe('hidden');
  });
});

describe('parseSurfaceOverrides', () => {
  it('accepts a well-formed override map', () => {
    expect(parseSurfaceOverrides({ dns: 'full', ssl: 'readonly' })).toEqual({
      dns: 'full',
      ssl: 'readonly',
    });
  });

  it('returns null for null, undefined and non-objects', () => {
    expect(parseSurfaceOverrides(null)).toBeNull();
    expect(parseSurfaceOverrides(undefined)).toBeNull();
    expect(parseSurfaceOverrides('full')).toBeNull();
    expect(parseSurfaceOverrides(['full'])).toBeNull();
  });

  it('drops invalid entries but keeps valid siblings', () => {
    expect(
      parseSurfaceOverrides({ dns: 'full', ssl: 'bogus', nope: 'full' })
    ).toEqual({ dns: 'full' });
  });

  it('returns null when nothing valid survives', () => {
    expect(parseSurfaceOverrides({ nope: 'bogus' })).toBeNull();
  });
});

describe('isSurfaceHidden', () => {
  it('is true only for hidden, not for readonly', () => {
    // readonly surfaces still render and must not 404.
    expect(isSurfaceHidden(IRONGROVE, 'dns', null)).toBe(true);
    expect(isSurfaceHidden(IRONGROVE, 'domains', null)).toBe(false);
    expect(isSurfaceHidden(IRONGROVE, 'website', null)).toBe(false);
  });
});

describe('visibleSurfaces', () => {
  it('omits hidden surfaces for Irongrove', () => {
    const visible = visibleSurfaces(IRONGROVE, null);
    expect(visible).not.toContain('dns');
    expect(visible).not.toContain('ssl');
    expect(visible).toContain('domains'); // readonly still shows
    expect(visible).toContain('website');
    expect(visible).toContain('billing');
  });

  it('includes everything for Javelina', () => {
    const visible = visibleSurfaces(JAVELINA, null);
    expect(visible).toEqual(
      expect.arrayContaining([
        'website',
        'analytics',
        'domains',
        'dns',
        'ssl',
        'email',
        'billing',
      ])
    );
  });

  it('reflects org overrides', () => {
    expect(visibleSurfaces(IRONGROVE, { dns: 'full' })).toContain('dns');
    expect(visibleSurfaces(JAVELINA, { dns: 'hidden' })).not.toContain('dns');
  });
});
