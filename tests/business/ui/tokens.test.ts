import { describe, expect, it } from 'vitest';
import { lightTokens, type Tokens } from '@/components/business/ui/tokens';

describe('business design tokens', () => {
  it('uses Javelina orange as the accent color', () => {
    expect(lightTokens.accent).toBe('#EF7215');
  });

  it('exposes every token role referenced by the mockup primitives', () => {
    const keys: (keyof Tokens)[] = [
      'bg', 'surface', 'surfaceAlt', 'surfaceHover',
      'border', 'borderStrong',
      'text', 'textMuted', 'textFaint',
      'accent', 'accentHover', 'accentSoft', 'accentSoftStrong', 'ring',
      'success', 'warning', 'danger',
      'shadowSm', 'shadowMd', 'shadowLg',
    ];
    for (const k of keys) {
      expect(lightTokens[k], `missing token: ${k}`).toBeTruthy();
    }
  });
});
