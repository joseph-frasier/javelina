'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  darkTokens,
  lightTokens,
  type Tokens,
} from '@/components/business/ui/tokens';

export type BusinessThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: BusinessThemeMode;
  toggle: () => void;
  set: (mode: BusinessThemeMode) => void;
}

export const useBusinessThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      toggle: () => set((s) => ({ mode: s.mode === 'light' ? 'dark' : 'light' })),
      set: (mode) => set({ mode }),
    }),
    { name: 'business-theme' },
  ),
);

export function useBusinessTheme(): Tokens {
  const mode = useBusinessThemeStore((s) => s.mode);
  return mode === 'dark' ? darkTokens : lightTokens;
}
