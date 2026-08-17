import { describe, it, expect } from 'vitest';
import { resolveBrandFromHost, resolveBrandById } from './resolve';

describe('resolveBrandFromHost', () => {
  it('resolves the Javelina production hosts', () => {
    expect(resolveBrandFromHost('javelina.cloud').id).toBe('javelina');
    expect(resolveBrandFromHost('app.javelina.cloud').id).toBe('javelina');
  });

  it('resolves the Irongrove production host', () => {
    expect(resolveBrandFromHost('app.irongrove.com').id).toBe('irongrove');
  });

  it('ignores a port when matching', () => {
    expect(resolveBrandFromHost('app.irongrove.com:3000').id).toBe('irongrove');
  });

  it('matches case-insensitively', () => {
    expect(resolveBrandFromHost('App.Irongrove.COM').id).toBe('irongrove');
  });

  it('tolerates surrounding whitespace', () => {
    expect(resolveBrandFromHost('  app.irongrove.com  ').id).toBe('irongrove');
  });

  it('falls back to Javelina for an unrecognised host', () => {
    expect(resolveBrandFromHost('some-preview-xyz.vercel.app').id).toBe('javelina');
  });

  it('falls back to Javelina for null, undefined and empty host', () => {
    expect(resolveBrandFromHost(null).id).toBe('javelina');
    expect(resolveBrandFromHost(undefined).id).toBe('javelina');
    expect(resolveBrandFromHost('').id).toBe('javelina');
  });

  it('does not match a host that merely ends with a brand hostname', () => {
    // Guards against substring matching: an attacker-controlled host must not
    // be able to borrow Irongrove branding.
    expect(resolveBrandFromHost('evil-app.irongrove.com.attacker.test').id).toBe('javelina');
  });

  it('resolves localhost to Javelina for local development', () => {
    expect(resolveBrandFromHost('localhost:3000').id).toBe('javelina');
  });
});

describe('resolveBrandById', () => {
  it('resolves a known id', () => {
    expect(resolveBrandById('irongrove').id).toBe('irongrove');
    expect(resolveBrandById('javelina').id).toBe('javelina');
  });

  it('falls back to Javelina for unknown, null and undefined ids', () => {
    expect(resolveBrandById('nope').id).toBe('javelina');
    expect(resolveBrandById(null).id).toBe('javelina');
    expect(resolveBrandById(undefined).id).toBe('javelina');
  });
});

describe('brand surface manifests', () => {
  it('gives Javelina full access to every surface', () => {
    const javelina = resolveBrandById('javelina');
    expect(Object.values(javelina.surfaces).every((m) => m === 'full')).toBe(true);
  });

  it('hides DNS and SSL from Irongrove and makes domains read-only', () => {
    const { surfaces } = resolveBrandById('irongrove');
    expect(surfaces.dns).toBe('hidden');
    expect(surfaces.ssl).toBe('hidden');
    expect(surfaces.domains).toBe('readonly');
    expect(surfaces.website).toBe('full');
    expect(surfaces.billing).toBe('full');
  });
});
