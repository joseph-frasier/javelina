'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useBrand } from '@/components/brand/BrandProvider';
import { makeTokens, type Tokens } from '@/components/business/ui/tokens';

export type BusinessThemeMode = 'light' | 'dark';

export function useBusinessThemeStore() {
  const theme = useSettingsStore((s) => s.general.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  return {
    mode: theme,
    toggle: () => setTheme(theme === 'light' ? 'dark' : 'light'),
    set: (mode: BusinessThemeMode) => setTheme(mode),
  };
}

export function useBusinessTheme(): Tokens {
  const theme = useSettingsStore((s) => s.general.theme);
  // Outside a BrandProvider this is Javelina, so existing surfaces are
  // unaffected by the brand layer.
  const brand = useBrand();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Avoid hydration flash: assume light until mounted, then sync. The brand
  // does not flash — it is resolved server-side from the request host.
  const mode: BusinessThemeMode = !mounted
    ? 'light'
    : theme === 'dark'
      ? 'dark'
      : 'light';

  return useMemo(() => makeTokens(brand.accent, mode), [brand.accent, mode]);
}
