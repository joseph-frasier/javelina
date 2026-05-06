import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useDashboardModeStore } from '@/lib/dashboard-mode-store';
import { useDashboardMode } from '@/lib/hooks/useDashboardMode';
import { useAuthStore } from '@/lib/auth-store';

function setUser(role: 'user' | 'superuser' | null) {
  useAuthStore.setState({
    // @ts-expect-error partial user shape is fine for the role coercion test
    user: role === null ? null : { id: 'u1', email: 'a@b', role },
  });
}

describe('useDashboardMode', () => {
  beforeEach(() => {
    useDashboardModeStore.setState({ mode: 'real' });
    setUser('superuser');
  });

  it('returns real by default', () => {
    const { result } = renderHook(() => useDashboardMode());
    expect(result.current.mode).toBe('real');
    expect(result.current.isMock).toBe(false);
  });

  it('returns mock when superuser sets it', () => {
    useDashboardModeStore.setState({ mode: 'mock' });
    const { result } = renderHook(() => useDashboardMode());
    expect(result.current.mode).toBe('mock');
    expect(result.current.isMock).toBe(true);
  });

  it('coerces non-superusers to real even if store says mock', () => {
    useDashboardModeStore.setState({ mode: 'mock' });
    setUser('user');
    const { result } = renderHook(() => useDashboardMode());
    expect(result.current.mode).toBe('real');
    expect(result.current.isMock).toBe(false);
  });

  it('coerces signed-out users to real', () => {
    useDashboardModeStore.setState({ mode: 'mock' });
    setUser(null);
    const { result } = renderHook(() => useDashboardMode());
    expect(result.current.mode).toBe('real');
  });

  it('toggle flips the underlying store', () => {
    const { result } = renderHook(() => useDashboardMode());
    act(() => result.current.toggle());
    expect(useDashboardModeStore.getState().mode).toBe('mock');
  });
});
