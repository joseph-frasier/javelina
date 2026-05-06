// lib/dashboard-mode-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type DashboardMode = 'real' | 'mock';

interface DashboardModeState {
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
  toggle: () => void;
}

export const useDashboardModeStore = create<DashboardModeState>()(
  persist(
    (set, get) => ({
      mode: 'real',
      setMode: (mode) => set({ mode }),
      toggle: () => set({ mode: get().mode === 'real' ? 'mock' : 'real' }),
    }),
    {
      name: 'jbp:dashboard-mode',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
