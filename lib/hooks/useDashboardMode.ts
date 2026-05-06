'use client';

import { useDashboardModeStore, type DashboardMode } from '@/lib/dashboard-mode-store';
import { useAuthStore } from '@/lib/auth-store';

interface UseDashboardModeResult {
  mode: DashboardMode;
  isMock: boolean;
  toggle: () => void;
  setMode: (mode: DashboardMode) => void;
}

export function useDashboardMode(): UseDashboardModeResult {
  const storedMode = useDashboardModeStore((s) => s.mode);
  const toggle = useDashboardModeStore((s) => s.toggle);
  const setMode = useDashboardModeStore((s) => s.setMode);
  const isSuperadmin = useAuthStore((s) => s.user?.superadmin === true);

  const mode: DashboardMode = isSuperadmin ? storedMode : 'real';

  return {
    mode,
    isMock: mode === 'mock',
    toggle,
    setMode,
  };
}
