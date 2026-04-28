'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/lib/settings-store';
import {
  darkTokens,
  lightTokens,
  type Tokens,
} from '@/components/business/ui/tokens';

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Avoid hydration flash: assume light until mounted, then sync.
  if (!mounted) return lightTokens;
  return theme === 'dark' ? darkTokens : lightTokens;
}
