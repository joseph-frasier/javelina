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

// Javelina orange accent scale — mockup's accent role, Javelina brand hex
const ACCENT = {
  500: '#EF7215',
  600: '#D46410',
  50: '#FEF0E5',
  100: '#FDE2CC',
  ring: 'rgba(239,114,21,0.18)',
};

export const lightTokens: Tokens = {
  bg: '#f7f8fa',
  surface: '#ffffff',
  surfaceAlt: '#fafbfc',
  surfaceHover: '#f4f5f7',
  border: '#e6e8ec',
  borderStrong: '#d3d7de',
  text: '#0f1419',
  textMuted: '#566271',
  textFaint: '#8a94a3',
  accent: ACCENT[500],
  accentHover: ACCENT[600],
  accentSoft: ACCENT[50],
  accentSoftStrong: ACCENT[100],
  ring: ACCENT.ring,
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  shadowSm: '0 1px 2px rgba(15,20,25,0.04), 0 1px 2px rgba(15,20,25,0.06)',
  shadowMd: '0 4px 12px rgba(15,20,25,0.06), 0 12px 32px rgba(15,20,25,0.06)',
  shadowLg: '0 24px 60px rgba(15,20,25,0.12), 0 2px 8px rgba(15,20,25,0.06)',
};

// Exported as default so wizard/dashboard components can import one symbol.
export const t: Tokens = lightTokens;
