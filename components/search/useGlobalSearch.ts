'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  searchApi,
  type GlobalSearchContext,
  type GlobalSearchResult,
  type GlobalSearchScope,
} from '@/lib/api-client';

export interface GlobalSearchActionResult {
  id: string;
  type: 'action';
  title: string;
  subtitle: string;
  route: string;
  score: number;
}

export type GlobalSearchUiResult = GlobalSearchResult | GlobalSearchActionResult;

interface UseGlobalSearchOptions {
  context: GlobalSearchContext;
  enabled: boolean;
  currentOrgId?: string | null;
}

const ACTIONS: Record<GlobalSearchContext, Omit<GlobalSearchActionResult, 'score'>[]> = {
  member: [
    {
      id: 'action-analytics',
      type: 'action',
      title: 'Go to Analytics',
      subtitle: 'Open analytics dashboard',
      route: '/analytics',
    },
    {
      id: 'action-profile',
      type: 'action',
      title: 'Go to Profile',
      subtitle: 'Open your profile page',
      route: '/profile',
    },
    {
      id: 'action-settings',
      type: 'action',
      title: 'Go to Settings',
      subtitle: 'Open account settings',
      route: '/settings',
    },
  ],
  admin: [
    {
      id: 'action-admin-users',
      type: 'action',
      title: 'Go to Admin Users',
      subtitle: 'Manage users',
      route: '/admin/users',
    },
    {
      id: 'action-admin-orgs',
      type: 'action',
      title: 'Go to Admin Organizations',
      subtitle: 'Manage organizations',
      route: '/admin/organizations',
    },
    {
      id: 'action-admin-audit',
      type: 'action',
      title: 'Go to Admin Audit Logs',
      subtitle: 'Inspect administrative activity',
      route: '/admin/audit',
    },
  ],
};

function scoreAction(query: string, title: string, subtitle: string): number {
  if (!query) return 40;
  const normalized = query.trim().toLowerCase();
  const titleLower = title.toLowerCase();
  const subtitleLower = subtitle.toLowerCase();
  if (titleLower === normalized) return 100;
  if (titleLower.startsWith(normalized)) return 80;
  if (titleLower.includes(normalized)) return 65;
  if (subtitleLower.includes(normalized)) return 50;
  return 0;
}

export function useGlobalSearch({
  context,
  enabled,
  currentOrgId,
}: UseGlobalSearchOptions) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<GlobalSearchScope>(context === 'admin' ? 'all' : 'current');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [shortcutHint, setShortcutHint] = useState('Cmd/Ctrl + K');
  const [shortcutBadge, setShortcutBadge] = useState('⌘/Ctrl K');
  const requestIdRef = useRef(0);

  const effectiveScope: GlobalSearchScope =
    context === 'admin'
      ? 'all'
      : scope === 'current' && !currentOrgId
        ? 'all'
        : scope;

  const actionResults = useMemo<GlobalSearchActionResult[]>(() => {
    const base = ACTIONS[context];
    const trimmed = query.trim();
    return base
      .map((action) => ({
        ...action,
        score: scoreAction(trimmed, action.title, action.subtitle),
      }))
      .filter((action) => action.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [context, query]);

  const mergedResults = useMemo<GlobalSearchUiResult[]>(() => {
    return [...actionResults, ...results].sort((a, b) => b.score - a.score);
  }, [actionResults, results]);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setSelectedIndex(0);
  }, []);

  const openSearch = useCallback(() => {
    if (!enabled) return;
    setIsOpen(true);
  }, [enabled]);

  const selectResult = useCallback(
    (result: GlobalSearchUiResult) => {
      if (!result?.route) return;
      closeSearch();
      router.push(result.route);
    },
    [closeSearch, router]
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(mergedResults.length - 1, 0)));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (event.key === 'Enter' && mergedResults.length > 0) {
        event.preventDefault();
        const result = mergedResults[selectedIndex] || mergedResults[0];
        if (result) {
          selectResult(result);
        }
      }
    },
    [mergedResults, selectedIndex, selectResult]
  );

  useEffect(() => {
    if (!enabled) return;
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      setIsOpen((prev) => !prev);
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [enabled]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const platform =
      nav.userAgentData?.platform ||
      navigator.platform ||
      navigator.userAgent ||
      '';
    const isMac = /mac/i.test(platform);
    setShortcutHint(isMac ? 'Cmd + K' : 'Ctrl + K');
    setShortcutBadge(isMac ? '⌘K' : 'Ctrl K');
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, effectiveScope, context]);

  useEffect(() => {
    if (!enabled || !isOpen) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const timeout = setTimeout(async () => {
      try {
        const response = await searchApi.global({
          q: trimmed,
          context,
          scope: effectiveScope,
          org_id: context === 'member' && effectiveScope === 'current' ? currentOrgId || undefined : undefined,
          limit: 50,
          useAdminAuth: context === 'admin',
        });

        if (requestIdRef.current !== requestId) return;
        setResults(response.results || []);
      } catch (err: any) {
        if (requestIdRef.current !== requestId) return;
        setResults([]);
        setError(err?.message || 'Search failed');
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [context, currentOrgId, effectiveScope, enabled, isOpen, query]);

  return {
    isOpen,
    openSearch,
    closeSearch,
    query,
    setQuery,
    scope,
    setScope,
    effectiveScope,
    loading,
    error,
    mergedResults,
    shortcutHint,
    shortcutBadge,
    selectedIndex,
    setSelectedIndex,
    onKeyDown,
    selectResult,
  };
}

export type UseGlobalSearchReturn = ReturnType<typeof useGlobalSearch>;
