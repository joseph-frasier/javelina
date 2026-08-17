import { describe, it, expect } from 'vitest';
import { makeTokens, lightTokens, darkTokens, t, type Tokens } from './tokens';
import { BRANDS } from '@/lib/brand/config';

/**
 * These literals are the pre-refactor output, copied from the module as it
 * stood before makeTokens existed. They are the contract: the token factory
 * may change how Javelina's tokens are produced, never what they are.
 */
const JAVELINA_LIGHT: Tokens = {
  bg: '#f7f8fa',
  surface: '#ffffff',
  surfaceAlt: '#fafbfc',
  surfaceHover: '#f4f5f7',
  border: '#e6e8ec',
  borderStrong: '#d3d7de',
  text: '#2c3a4a',
  textMuted: '#566271',
  textFaint: '#8a94a3',
  accent: '#EF7215',
  accentHover: '#D46410',
  accentSoft: '#FEF0E5',
  accentSoftStrong: '#FDE2CC',
  ring: 'rgba(239,114,21,0.18)',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  shadowSm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  shadowMd: '0 8px 24px rgba(0, 0, 0, 0.35)',
  shadowLg: '0 24px 60px rgba(0, 0, 0, 0.5)',
};

const JAVELINA_DARK: Tokens = {
  bg: '#0b0d10',
  surface: '#14181d',
  surfaceAlt: '#181d23',
  surfaceHover: '#1d242b',
  border: '#232a32',
  borderStrong: '#303944',
  text: '#c8d3dd',
  textMuted: '#8a95a3',
  textFaint: '#5e6b78',
  accent: '#EF7215',
  accentHover: '#D46410',
  // Dark mode uses translucent tints, NOT the 50/100 steps used in light mode.
  accentSoft: 'rgba(239,114,21,0.12)',
  accentSoftStrong: 'rgba(239,114,21,0.2)',
  ring: 'rgba(239,114,21,0.18)',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  shadowSm: '0 1px 2px rgba(15, 20, 25, 0.04), 0 1px 2px rgba(15, 20, 25, 0.06)',
  shadowMd: '0 4px 12px rgba(15, 20, 25, 0.06), 0 12px 32px rgba(15, 20, 25, 0.06)',
  shadowLg: '0 24px 60px rgba(15, 20, 25, 0.12), 0 2px 8px rgba(15, 20, 25, 0.06)',
};

describe('Javelina rendering is unchanged by the factory', () => {
  it('produces the exact pre-refactor light tokens', () => {
    expect(makeTokens(BRANDS.javelina.accent, 'light')).toEqual(JAVELINA_LIGHT);
  });

  it('produces the exact pre-refactor dark tokens', () => {
    expect(makeTokens(BRANDS.javelina.accent, 'dark')).toEqual(JAVELINA_DARK);
  });

  it('keeps the lightTokens / darkTokens / t exports intact for existing consumers', () => {
    expect(lightTokens).toEqual(JAVELINA_LIGHT);
    expect(darkTokens).toEqual(JAVELINA_DARK);
    expect(t).toEqual(JAVELINA_LIGHT);
  });
});

describe('dark mode uses translucent accent tints, not the light 50/100 steps', () => {
  // This is the regression the factory could most easily introduce: reusing
  // accent[50] / accent[100] in dark mode would paint opaque cream panels on
  // a near-black surface.
  it('never reuses the light soft steps in dark mode', () => {
    const dark = makeTokens(BRANDS.javelina.accent, 'dark');
    expect(dark.accentSoft).not.toBe(BRANDS.javelina.accent[50]);
    expect(dark.accentSoftStrong).not.toBe(BRANDS.javelina.accent[100]);
    expect(dark.accentSoft).toMatch(/^rgba\(/);
    expect(dark.accentSoftStrong).toMatch(/^rgba\(/);
  });
});

describe('brand accent is the only thing that varies', () => {
  const ACCENT_KEYS = [
    'accent',
    'accentHover',
    'accentSoft',
    'accentSoftStrong',
    'ring',
  ] as const;

  it.each(['light', 'dark'] as const)(
    'changes every accent-derived token and nothing else in %s mode',
    (mode) => {
      const javelina = makeTokens(BRANDS.javelina.accent, mode);
      const irongrove = makeTokens(BRANDS.irongrove.accent, mode);

      for (const key of ACCENT_KEYS) {
        expect(irongrove[key], `${key} should differ between brands`).not.toBe(
          javelina[key]
        );
      }

      const nonAccent = (tokens: Tokens) =>
        Object.fromEntries(
          Object.entries(tokens).filter(
            ([k]) => !ACCENT_KEYS.includes(k as (typeof ACCENT_KEYS)[number])
          )
        );
      expect(nonAccent(irongrove)).toEqual(nonAccent(javelina));
    }
  );

  it('uses the Irongrove ember as the accent', () => {
    expect(makeTokens(BRANDS.irongrove.accent, 'light').accent).toBe('#FF8D10');
  });
});

describe('Tokens shape', () => {
  it('exposes exactly the 20 documented fields in both modes', () => {
    const light = Object.keys(makeTokens(BRANDS.javelina.accent, 'light')).sort();
    const dark = Object.keys(makeTokens(BRANDS.javelina.accent, 'dark')).sort();
    expect(light).toHaveLength(20);
    expect(light).toEqual(dark);
  });
});
