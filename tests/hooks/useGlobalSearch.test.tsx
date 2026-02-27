import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useGlobalSearch } from '@/components/search/useGlobalSearch';
import { searchApi } from '@/lib/api-client';

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<any>('@/lib/api-client');
  return {
    ...actual,
    searchApi: {
      global: vi.fn(),
    },
  };
});

describe('useGlobalSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens with Cmd/Ctrl+K when enabled', () => {
    const { result } = renderHook(() =>
      useGlobalSearch({ context: 'member', enabled: true, currentOrgId: 'org-1' })
    );

    expect(result.current.isOpen).toBe(false);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('does not open with shortcut when disabled', () => {
    const { result } = renderHook(() =>
      useGlobalSearch({ context: 'member', enabled: false, currentOrgId: 'org-1' })
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('debounces backend search requests', async () => {
    vi.mocked(searchApi.global).mockResolvedValue({
      query: 'zone',
      scope: 'current',
      context: 'member',
      results: [],
      counts: {},
      took_ms: 2,
    });

    const { result } = renderHook(() =>
      useGlobalSearch({ context: 'member', enabled: true, currentOrgId: 'org-1' })
    );

    act(() => {
      result.current.openSearch();
      result.current.setQuery('zone');
    });

    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    expect(searchApi.global).toHaveBeenCalledTimes(1);

    expect(searchApi.global).toHaveBeenCalledWith({
      q: 'zone',
      context: 'member',
      scope: 'current',
      org_id: 'org-1',
      limit: 50,
    });
  });

  it('forces admin searches to use all scope without org_id', async () => {
    vi.mocked(searchApi.global).mockResolvedValue({
      query: 'user',
      scope: 'all',
      context: 'admin',
      results: [],
      counts: {},
      took_ms: 2,
    });

    const { result } = renderHook(() => useGlobalSearch({ context: 'admin', enabled: true }));

    act(() => {
      result.current.openSearch();
      result.current.setQuery('user');
    });

    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    expect(searchApi.global).toHaveBeenCalledWith({
      q: 'user',
      context: 'admin',
      scope: 'all',
      org_id: undefined,
      limit: 50,
    });
  });

  it('selectResult navigates and closes the modal', () => {
    const { result } = renderHook(() =>
      useGlobalSearch({ context: 'admin', enabled: true })
    );

    act(() => {
      result.current.openSearch();
      result.current.selectResult({
        id: 'action-admin-users',
        type: 'action',
        title: 'Go to Admin Users',
        subtitle: 'Manage users',
        route: '/admin/users',
        score: 100,
      });
    });

    expect(pushMock).toHaveBeenCalledWith('/admin/users');
    expect(result.current.isOpen).toBe(false);
  });
});
