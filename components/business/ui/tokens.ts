import { BRANDS, type AccentScale } from '@/lib/brand/config';

export type { AccentScale };

export interface Tokens {
  bg: string;
  surface: string;
  surfaceAlt: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentSoftStrong: string;
  ring: string;
  success: string;
  warning: string;
  danger: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
}

export const FONT =
  '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, system-ui, sans-serif';
export const MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

const JAVELINA_ACCENT: AccentScale = BRANDS.javelina.accent;

export type ThemeMode = 'light' | 'dark';

// Everything that does not vary by brand. Only the accent-derived fields are
// filled in by makeTokens.
type NonAccentTokens = Omit<
  Tokens,
  'accent' | 'accentHover' | 'accentSoft' | 'accentSoftStrong' | 'ring'
>;

const LIGHT_BASE: NonAccentTokens = {
  bg: '#f7f8fa',
  surface: '#ffffff',
  surfaceAlt: '#fafbfc',
  surfaceHover: '#f4f5f7',
  border: '#e6e8ec',
  borderStrong: '#d3d7de',
  text: '#2c3a4a',
  textMuted: '#566271',
  textFaint: '#8a94a3',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  shadowSm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  shadowMd: '0 8px 24px rgba(0, 0, 0, 0.35)',
  shadowLg: '0 24px 60px rgba(0, 0, 0, 0.5)',
};

const DARK_BASE: NonAccentTokens = {
  bg: '#0b0d10',
  surface: '#14181d',
  surfaceAlt: '#181d23',
  surfaceHover: '#1d242b',
  border: '#232a32',
  borderStrong: '#303944',
  text: '#c8d3dd',
  textMuted: '#8a95a3',
  textFaint: '#5e6b78',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  shadowSm: '0 1px 2px rgba(15, 20, 25, 0.04), 0 1px 2px rgba(15, 20, 25, 0.06)',
  shadowMd: '0 4px 12px rgba(15, 20, 25, 0.06), 0 12px 32px rgba(15, 20, 25, 0.06)',
  shadowLg: '0 24px 60px rgba(15, 20, 25, 0.12), 0 2px 8px rgba(15, 20, 25, 0.06)',
};

/**
 * Build a token set for a brand accent in a given mode.
 *
 * The `Tokens` interface is unchanged by design — every consuming component
 * keeps working untouched. Only the five accent-derived fields vary by brand.
 *
 * Note the light/dark asymmetry: light mode uses the opaque 50/100 steps,
 * dark mode uses translucent tints. Reusing the light steps in dark mode
 * paints cream panels on a near-black surface.
 */
export function makeTokens(accent: AccentScale, mode: ThemeMode): Tokens {
  const base = mode === 'dark' ? DARK_BASE : LIGHT_BASE;
  return {
    ...base,
    accent: accent[500],
    accentHover: accent[600],
    accentSoft: mode === 'dark' ? accent.softDark : accent[50],
    accentSoftStrong: mode === 'dark' ? accent.softStrongDark : accent[100],
    ring: accent.ring,
  };
}

// Javelina-bound instances, kept so existing imports keep working unchanged.
// Brand-aware surfaces should call makeTokens (via useBusinessTheme) instead.
export const lightTokens: Tokens = makeTokens(JAVELINA_ACCENT, 'light');
export const darkTokens: Tokens = makeTokens(JAVELINA_ACCENT, 'dark');

// Exported as default so wizard/dashboard components can import one symbol.
// For surfaces that adopt light/dark mode, use useBusinessTheme() instead.
export const t: Tokens = lightTokens;
